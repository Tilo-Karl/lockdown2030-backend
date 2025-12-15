// ld2030/v1/engine/state-writer-equipment.js
// Transaction-only equipment writes.
// - Re-reads actor + item inside tx
// - Re-validates invariants to avoid races
// - Applies the patch computed by equipment-service
// No derived-stat computation here.

module.exports = function makeEquipmentWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-equipment: db is required');
  if (!admin) throw new Error('state-writer-equipment: admin is required');
  if (!state) throw new Error('state-writer-equipment: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  function listIdsDeep(equipment) {
    const ids = [];
    const walk = (v) => {
      if (!v) return;
      if (typeof v === 'string') {
        ids.push(v);
        return;
      }
      if (typeof v === 'object' && !Array.isArray(v)) {
        for (const vv of Object.values(v)) walk(vv);
      }
    };
    walk(equipment || {});
    return Array.from(new Set(ids.filter(Boolean)));
  }

  // Mimic Firestore merge:true for nested equipment maps (1-level deep merge)
  function mergeEquipment(currentEq, patchEq) {
    const base = (currentEq && typeof currentEq === 'object') ? currentEq : {};
    const patch = (patchEq && typeof patchEq === 'object') ? patchEq : null;
    if (!patch) return base;

    const out = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const cur = base[k];
        out[k] = {
          ...(cur && typeof cur === 'object' && !Array.isArray(cur) ? cur : {}),
          ...v,
        };
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  async function findActorByIdTx(tx, gameId, actorId) {
    const cols = [
      state.playersCol(gameId),
      state.humansCol(gameId),
      state.zombiesCol(gameId),
    ];

    for (const col of cols) {
      const ref = col.doc(actorId);
      const snap = await tx.get(ref);
      if (snap.exists) return { ref, data: snap.data() || {} };
    }
    return null;
  }

  function getSlotNode(equipment, item) {
    const eq = equipment || {};
    const slot = String(item.slot || '').trim();
    const slotKey = String(item.slotKey || '').trim();

    if (!slot) throw new Error('equip: missing_slot');
    if (!slotKey) throw new Error('equip: missing_slotKey');

    if (!Object.prototype.hasOwnProperty.call(eq, slot)) throw new Error('equip: invalid_slot');
    const group = eq[slot];
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error('equip: invalid_slot_group');

    if (!Object.prototype.hasOwnProperty.call(group, slotKey)) throw new Error('equip: invalid_slotKey');

    return { slot, slotKey, node: group[slotKey] };
  }

  async function equipItem({ gameId = 'lockdown2030', actorId, itemId, patch }) {
    if (!actorId || !itemId) throw new Error('equipItem: missing_actorId_or_itemId');
    if (!patch || typeof patch !== 'object') throw new Error('equipItem: missing_patch');

    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      const actorInfo = await findActorByIdTx(tx, gameId, actorId);
      if (!actorInfo) throw new Error('equipItem: actor_not_found');

      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists) throw new Error('equipItem: item_not_found');

      const actorRef = actorInfo.ref;
      const actor = actorInfo.data || {};
      const item = itemSnap.data() || {};

      if (String(actor.type || '').toUpperCase() !== 'HUMAN') throw new Error('equipItem: actor_not_human');
      if (!item.slot || !item.slotKey) throw new Error('equipItem: item_not_equippable');

      const inv = Array.isArray(actor.inventory) ? actor.inventory : [];
      if (!inv.includes(itemId)) throw new Error('equipItem: item_not_in_inventory');

      const slotInfo = getSlotNode(actor.equipment, item);
      const node = slotInfo.node;

      if (node && typeof node === 'object' && !Array.isArray(node)) {
        const layer = String(item.layer || '').trim();
        if (!layer) throw new Error('equipItem: missing_layer');
        if (!Object.prototype.hasOwnProperty.call(node, layer)) throw new Error('equipItem: invalid_layer');
        if (node[layer] !== null) throw new Error('equipItem: layer_occupied');
      } else {
        if (node !== null) throw new Error('equipItem: slot_occupied');
      }

      if (!Array.isArray(patch.inventory)) throw new Error('equipItem: patch_missing_inventory');
      if (patch.inventory.includes(itemId)) throw new Error('equipItem: patch_inventory_still_contains_item');

      const equipmentAfter = mergeEquipment(actor.equipment, patch.equipment);
      const equippedAfter = listIdsDeep(equipmentAfter);
      if (!equippedAfter.includes(itemId)) throw new Error('equipItem: patch_does_not_equip_item');
      if (equippedAfter.length !== new Set(equippedAfter).size) throw new Error('equipItem: duplicate_equipped_ids');

      tx.set(actorRef, { ...patch, updatedAt: serverTs() }, { merge: true });
    });

    return { ok: true };
  }

  async function unequipItem({ gameId = 'lockdown2030', actorId, itemId, patch }) {
    if (!actorId || !itemId) throw new Error('unequipItem: missing_actorId_or_itemId');
    if (!patch || typeof patch !== 'object') throw new Error('unequipItem: missing_patch');

    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      const actorInfo = await findActorByIdTx(tx, gameId, actorId);
      if (!actorInfo) throw new Error('unequipItem: actor_not_found');

      const itemSnap = await tx.get(itemRef);
      if (!itemSnap.exists) throw new Error('unequipItem: item_not_found');

      const actorRef = actorInfo.ref;
      const actor = actorInfo.data || {};
      const item = itemSnap.data() || {};

      if (!item.slot || !item.slotKey) throw new Error('unequipItem: item_not_equippable');

      const equippedNow = listIdsDeep(actor.equipment);
      if (!equippedNow.includes(itemId)) throw new Error('unequipItem: item_not_equipped');

      if (!Array.isArray(patch.inventory)) throw new Error('unequipItem: patch_missing_inventory');
      if (!patch.inventory.includes(itemId)) throw new Error('unequipItem: patch_inventory_missing_item');

      const equipmentAfter = mergeEquipment(actor.equipment, patch.equipment);
      const equippedAfter = listIdsDeep(equipmentAfter);
      if (equippedAfter.includes(itemId)) throw new Error('unequipItem: patch_does_not_unequip_item');

      tx.set(actorRef, { ...patch, updatedAt: serverTs() }, { merge: true });
    });

    return { ok: true };
  }

  return {
    equipItem,
    unequipItem,
  };
};