// ld2030/v1/engine/state-writer-inventory.js
// Transaction-only inventory writes (pickup/drop).
// - No caching.
// - Re-reads actor + item inside tx.
// - Updates BOTH actor doc and item doc in the same transaction.
// - Enforces: cannot drop equipped items; pickup requires item on your tile.

const makeTx = require('./tx');
const { listIdsDeep, findActorByIdTx } = require('./actor-tx-helpers');

module.exports = function makeInventoryWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-inventory: db is required');
  if (!admin) throw new Error('state-writer-inventory: admin is required');
  if (!state) throw new Error('state-writer-inventory: state is required');

  const txHelpers = makeTx({ db, admin });
  const { run, setWithUpdatedAt } = txHelpers;

  function samePos(a, b) {
    if (!a || !b) return false;
    return (
      Number(a.x) === Number(b.x) &&
      Number(a.y) === Number(b.y) &&
      Number(a.z) === Number(b.z) &&
      Number(a.layer) === Number(b.layer)
    );
  }

  async function pickupItem({ gameId = 'lockdown2030', actorId, itemId, patchActor, patchItem }) {
    if (!actorId || !itemId) throw new Error('pickupItem: missing_actorId_or_itemId');
    if (!patchActor || typeof patchActor !== 'object') throw new Error('pickupItem: missing_patchActor');
    if (!patchItem || typeof patchItem !== 'object') throw new Error('pickupItem: missing_patchItem');

    const itemRef = state.itemsCol(gameId).doc(itemId);

    await run('pickupItem', async (txn) => {
      const actorInfo = await findActorByIdTx({ tx: txn, state, gameId, actorId });
      if (!actorInfo) throw new Error('pickupItem: actor_not_found');

      const itemSnap = await txn.get(itemRef);
      if (!itemSnap.exists) throw new Error('pickupItem: item_not_found');

      const actorRef = actorInfo.ref;
      const actor = actorInfo.data || {};
      const item = itemSnap.data() || {};

      if (String(actor.type || '').toUpperCase() !== 'HUMAN') throw new Error('pickupItem: actor_not_human');
      if (String(item.type || '').toUpperCase() !== 'ITEM') throw new Error('pickupItem: item_not_item');

      // Must be on same tile (x,y,z,layer), and not already carried.
      if (item.carriedBy) throw new Error('pickupItem: item_already_carried');
      if (!samePos(actor.pos, item.pos)) throw new Error('pickupItem: item_not_on_actor_tile');

      // Patch must add item to inventory.
      const invAfter = patchActor.inventory;
      if (!Array.isArray(invAfter)) throw new Error('pickupItem: patch_inventory_missing');
      if (!invAfter.includes(itemId)) throw new Error('pickupItem: patch_does_not_add_item');

      // Patch item must set carriedBy and remove pos (pos=null)
      if (patchItem.carriedBy !== actorId) throw new Error('pickupItem: patchItem_missing_carriedBy');
      if (patchItem.pos !== null) throw new Error('pickupItem: patchItem_pos_must_be_null');

      setWithUpdatedAt(txn, actorRef, patchActor);
      setWithUpdatedAt(txn, itemRef, patchItem);
    });

    return { ok: true };
  }

  async function dropItem({ gameId = 'lockdown2030', actorId, itemId, patchActor, patchItem }) {
    if (!actorId || !itemId) throw new Error('dropItem: missing_actorId_or_itemId');
    if (!patchActor || typeof patchActor !== 'object') throw new Error('dropItem: missing_patchActor');
    if (!patchItem || typeof patchItem !== 'object') throw new Error('dropItem: missing_patchItem');

    const itemRef = state.itemsCol(gameId).doc(itemId);

    await run('dropItem', async (txn) => {
      const actorInfo = await findActorByIdTx({ tx: txn, state, gameId, actorId });
      if (!actorInfo) throw new Error('dropItem: actor_not_found');

      const itemSnap = await txn.get(itemRef);
      if (!itemSnap.exists) throw new Error('dropItem: item_not_found');

      const actorRef = actorInfo.ref;
      const actor = actorInfo.data || {};
      const item = itemSnap.data() || {};

      if (String(actor.type || '').toUpperCase() !== 'HUMAN') throw new Error('dropItem: actor_not_human');
      if (String(item.type || '').toUpperCase() !== 'ITEM') throw new Error('dropItem: item_not_item');

      const invNow = Array.isArray(actor.inventory) ? actor.inventory : [];
      if (!invNow.includes(itemId)) throw new Error('dropItem: item_not_in_inventory');

      // Cannot drop equipped items.
      const equippedNow = listIdsDeep(actor.equipment);
      if (equippedNow.includes(itemId)) throw new Error('dropItem: item_is_equipped');

      // Patch must remove item from inventory.
      const invAfter = patchActor.inventory;
      if (!Array.isArray(invAfter)) throw new Error('dropItem: patch_inventory_missing');
      if (invAfter.includes(itemId)) throw new Error('dropItem: patch_does_not_remove_item');

      // Patch item must clear carriedBy and set pos to actor.pos (x,y,z,layer).
      if (patchItem.carriedBy !== null) throw new Error('dropItem: patchItem_carriedBy_must_be_null');
      if (!samePos(patchItem.pos, actor.pos)) throw new Error('dropItem: patchItem_pos_must_equal_actor_pos');

      setWithUpdatedAt(txn, actorRef, patchActor);
      setWithUpdatedAt(txn, itemRef, patchItem);
    });

    return { ok: true };
  }

  return {
    pickupItem,
    dropItem,
  };
};
