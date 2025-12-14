// ld2030/v1/engine/state-writer-equipment.js
// Transaction-only equipment writes.
// - Re-reads actor + item inside tx
// - Re-validates minimal invariants to avoid races
// - Applies the patch computed by equipment-service
// No derived-stat computation here.

module.exports = function makeEquipmentWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-equipment: db is required');
  if (!admin) throw new Error('state-writer-equipment: admin is required');
  if (!state) throw new Error('state-writer-equipment: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  function listEquippedItemIds(equipment) {
    const eq = equipment || {};
    const ids = [];

    for (const v of Object.values(eq)) {
      if (!v) continue;
      if (typeof v === 'string') ids.push(v);
      else if (typeof v === 'object') {
        for (const vv of Object.values(v)) {
          if (typeof vv === 'string' && vv) ids.push(vv);
        }
      }
    }
    return Array.from(new Set(ids));
  }

  async function equipItem({ gameId = 'lockdown2030', actorId, itemId, patch }) {
    if (!actorId || !itemId) throw new Error('equipItem: missing_actorId_or_itemId');
    if (!patch || typeof patch !== 'object') throw new Error('equipItem: missing_patch');

    const actorRef = state.playersCol(gameId).doc(actorId);
    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      const actorSnap = await tx.get(actorRef);
      const itemSnap = await tx.get(itemRef);

      if (!actorSnap.exists) throw new Error('equipItem: actor_not_found');
      if (!itemSnap.exists) throw new Error('equipItem: item_not_found');

      const actor = actorSnap.data() || {};
      const item = itemSnap.data() || {};

      // Minimal invariants
      if (String(actor.type || '').toUpperCase() !== 'HUMAN') {
        // you may allow zombies/NPCs later; for now keep it strict
        throw new Error('equipItem: actor_not_human');
      }

      if (!item.slot) throw new Error('equipItem: item_not_equippable');

      // Must be in inventory at commit time
      const inv = Array.isArray(actor.inventory) ? actor.inventory : [];
      if (!inv.includes(itemId)) throw new Error('equipItem: item_not_in_inventory');

      // Slot/layer must still be free at commit time
      const eq = actor.equipment || {};
      const slotVal = eq[item.slot];
      if (!slotVal) throw new Error('equipItem: invalid_slot_on_actor');

      if (typeof slotVal === 'object') {
        const layer = item.layer || 'base';
        if (slotVal[layer]) throw new Error('equipItem: layer_occupied');
      } else {
        if (slotVal !== null) throw new Error('equipItem: slot_occupied');
      }

      // Patch sanity: must result in itemId being equipped
      const equippedAfter = listEquippedItemIds(patch.equipment);
      if (!equippedAfter.includes(itemId)) throw new Error('equipItem: patch_does_not_equip_item');

      tx.set(
        actorRef,
        {
          ...patch,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  async function unequipItem({ gameId = 'lockdown2030', actorId, itemId, patch }) {
    if (!actorId || !itemId) throw new Error('unequipItem: missing_actorId_or_itemId');
    if (!patch || typeof patch !== 'object') throw new Error('unequipItem: missing_patch');

    const actorRef = state.playersCol(gameId).doc(actorId);
    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      const actorSnap = await tx.get(actorRef);
      const itemSnap = await tx.get(itemRef);

      if (!actorSnap.exists) throw new Error('unequipItem: actor_not_found');
      if (!itemSnap.exists) throw new Error('unequipItem: item_not_found');

      const actor = actorSnap.data() || {};
      const item = itemSnap.data() || {};

      if (!item.slot) throw new Error('unequipItem: item_not_equippable');

      // Must be equipped at commit time
      const equippedNow = listEquippedItemIds(actor.equipment);
      if (!equippedNow.includes(itemId)) throw new Error('unequipItem: item_not_equipped');

      // Patch sanity: must remove from equipment
      const equippedAfter = listEquippedItemIds(patch.equipment);
      if (equippedAfter.includes(itemId)) throw new Error('unequipItem: patch_does_not_unequip_item');

      tx.set(
        actorRef,
        {
          ...patch,
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