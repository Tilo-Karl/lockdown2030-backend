// ld2030/v1/engine/actor-item-tx.js
// Helpers for writers that touch both actors and items.

const { findActorByIdTx, listIdsDeep } = require('./actor-tx-helpers');

async function readActorAndItemTx({ tx, state, gameId, actorId, itemId }) {
  if (!tx) throw new Error('readActorAndItemTx: tx required');
  if (!state) throw new Error('readActorAndItemTx: state required');

  const actorInfo = await findActorByIdTx({ tx, state, gameId, actorId: String(actorId) });
  if (!actorInfo) return { missing: 'actor' };

  const itemRef = state.itemsCol(gameId).doc(String(itemId));
  const itemSnap = await tx.get(itemRef);
  if (!itemSnap.exists) return { missing: 'item' };

  return {
    actorRef: actorInfo.ref,
    actorSnap: actorInfo.snap,
    actor: actorInfo.data || {},
    itemRef,
    itemSnap,
    item: itemSnap.data() || {},
  };
}

async function requireActorAndItemTx({
  tx,
  state,
  gameId,
  actorId,
  itemId,
  errActor = 'requireActorAndItemTx: actor_not_found',
  errItem = 'requireActorAndItemTx: item_not_found',
}) {
  const read = await readActorAndItemTx({ tx, state, gameId, actorId, itemId });
  if (!read) throw new Error('requireActorAndItemTx: missing_read_result');
  if (read.missing === 'actor') throw new Error(errActor);
  if (read.missing === 'item') throw new Error(errItem);
  return read;
}

module.exports = {
  listIdsDeep,
  readActorAndItemTx,
  requireActorAndItemTx,
};
