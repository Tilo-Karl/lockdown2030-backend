// ld2030/v1/engine/state-writer-equipment.js
// Transactional equip/unequip writes.
// Rules are pure (equipment-rules.js). This file enforces them against Firestore state.

const {
  canEquip,
  equip,
  unequip,
  computeDerivedStats,
} = require('./equipment-rules');

module.exports = function makeEquipmentWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-equipment: db is required');
  if (!admin) throw new Error('state-writer-equipment: admin is required');
  if (!state) throw new Error('state-writer-equipment: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  async function ensureCreatedAtTx(tx, ref) {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { createdAt: serverTs() }, { merge: true });
      return;
    }
    const data = snap.data() || {};
    if (data.createdAt == null) {
      tx.set(ref, { createdAt: serverTs() }, { merge: true });
    }
  }

  function extractEquippedItemIds(equipment) {
    const ids = [];
    if (!equipment || typeof equipment !== 'object') return ids;

    for (const val of Object.values(equipment)) {
      if (!val) continue;
      if (typeof val === 'string') {
        ids.push(val);
        continue;
      }
      if (typeof val === 'object') {
        for (const inner of Object.values(val)) {
          if (typeof inner === 'string') ids.push(inner);
        }
      }
    }

    return Array.from(new Set(ids));
  }

  async function fetchItemsByIdsTx(tx, gameId, itemIds) {
    const col = state.itemsCol(gameId);
    const snaps = await Promise.all(itemIds.map((id) => tx.get(col.doc(id))));
    return snaps
      .filter((s) => s && s.exists)
      .map((s) => ({ id: s.id, ...(s.data() || {}) }));
  }

  async function equipItem({ gameId = 'lockdown2030', actorId, itemId }) {
    if (!actorId) throw new Error('equipItem: actorId is required');
    if (!itemId) throw new Error('equipItem: itemId is required');

    const actorRef = state.playersCol(gameId).doc(actorId);
    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, actorRef);

      const actorSnap = await tx.get(actorRef);
      const itemSnap = await tx.get(itemRef);

      if (!actorSnap.exists) throw new Error('equipItem: actor_not_found');
      if (!itemSnap.exists) throw new Error('equipItem: item_not_found');

      const actor = actorSnap.data() || {};
      const item = itemSnap.data() || {};

      if (String(item.type || '').toUpperCase() !== 'ITEM') {
        throw new Error('equipItem: target_not_item');
      }

      // Must be in inventory to equip
      const inv = Array.isArray(actor.inventory) ? actor.inventory.slice() : [];
      if (!inv.includes(itemId)) {
        throw new Error('equipItem: item_not_in_inventory');
      }

      const check = canEquip({ actor, item });
      if (!check.ok) {
        throw new Error(`equipItem: ${check.reason}`);
      }

      const newEquipment = equip(actor, item, itemId);

      // remove from inventory when equipped
      const nextInventory = inv.filter((id) => id !== itemId);

      // carryUsed = weight of inventory items (equipped items don't count)
      const itemWeight = Number.isFinite(item.weight) ? Number(item.weight) : 0;
      const curCarryUsed = Number.isFinite(actor.carryUsed) ? Number(actor.carryUsed) : 0;
      const nextCarryUsed = Math.max(0, curCarryUsed - itemWeight);

      // recompute derived stats
      const equippedIds = extractEquippedItemIds(newEquipment);
      const equippedItems = await fetchItemsByIdsTx(tx, gameId, equippedIds);
      const derived = computeDerivedStats(actor, equippedItems);

      tx.set(
        actorRef,
        {
          equipment: newEquipment,
          inventory: nextInventory,
          carryUsed: nextCarryUsed,
          derived: {
            armor: derived.armor,
            maxHpBonus: derived.maxHpBonus,
            moveApPenalty: derived.moveApPenalty,
            weaponKind: derived.weapon ? derived.weapon.kind || null : null,
            weaponItemId: derived.weapon ? derived.weapon.id || null : null,
          },
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  async function unequipItem({ gameId = 'lockdown2030', actorId, itemId }) {
    if (!actorId) throw new Error('unequipItem: actorId is required');
    if (!itemId) throw new Error('unequipItem: itemId is required');

    const actorRef = state.playersCol(gameId).doc(actorId);
    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, actorRef);

      const actorSnap = await tx.get(actorRef);
      const itemSnap = await tx.get(itemRef);

      if (!actorSnap.exists) throw new Error('unequipItem: actor_not_found');
      if (!itemSnap.exists) throw new Error('unequipItem: item_not_found');

      const actor = actorSnap.data() || {};
      const item = itemSnap.data() || {};

      if (!item.slot) {
        throw new Error('unequipItem: item_not_equippable');
      }

      // confirm it's currently equipped
      const equipment = actor.equipment || {};
      const slotVal = equipment[item.slot];
      const layer = item.layer || 'base';

      let isEquipped = false;
      if (typeof slotVal === 'string') {
        isEquipped = slotVal === itemId;
      } else if (slotVal && typeof slotVal === 'object') {
        isEquipped = slotVal[layer] === itemId;
      }

      if (!isEquipped) {
        throw new Error('unequipItem: item_not_equipped');
      }

      const newEquipment = unequip(actor, item);

      // add back to inventory
      const inv = Array.isArray(actor.inventory) ? actor.inventory.slice() : [];
      const nextInventory = inv.includes(itemId) ? inv : [...inv, itemId];

      // carryUsed = weight of inventory items
      const itemWeight = Number.isFinite(item.weight) ? Number(item.weight) : 0;
      const curCarryUsed = Number.isFinite(actor.carryUsed) ? Number(actor.carryUsed) : 0;
      const nextCarryUsed = curCarryUsed + itemWeight;

      // recompute derived stats
      const equippedIds = extractEquippedItemIds(newEquipment);
      const equippedItems = await fetchItemsByIdsTx(tx, gameId, equippedIds);
      const derived = computeDerivedStats(actor, equippedItems);

      tx.set(
        actorRef,
        {
          equipment: newEquipment,
          inventory: nextInventory,
          carryUsed: nextCarryUsed,
          derived: {
            armor: derived.armor,
            maxHpBonus: derived.maxHpBonus,
            moveApPenalty: derived.moveApPenalty,
            weaponKind: derived.weapon ? derived.weapon.kind || null : null,
            weaponItemId: derived.weapon ? derived.weapon.id || null : null,
          },
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  return {
    equipItem,
    unequipItem,
  };
};