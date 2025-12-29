// ld2030/v1/engine/entity-tx-helpers.js
// Shared helpers for reading entities inside Firestore transactions.

async function findEntityByIdTx({ tx, state, gameId, entityId, includeItems = true }) {
  if (!tx) throw new Error('findEntityByIdTx: tx required');
  if (!state) throw new Error('findEntityByIdTx: state required');

  const id = String(entityId);
  const cols = [
    state.playersCol(gameId),
    state.zombiesCol(gameId),
    state.humansCol(gameId),
  ];

  if (includeItems) cols.push(state.itemsCol(gameId));

  for (const col of cols) {
    const ref = col.doc(id);
    const snap = await tx.get(ref);
    if (snap.exists) {
      return { ref, snap, data: snap.data() || {} };
    }
  }

  return null;
}

async function readItemByIdTx({ tx, state, gameId, itemId }) {
  if (!tx) throw new Error('readItemByIdTx: tx required');
  if (!state) throw new Error('readItemByIdTx: state required');

  const ref = state.itemsCol(gameId).doc(String(itemId));
  const snap = await tx.get(ref);

  if (!snap.exists) return null;

  return { ref, snap, data: snap.data() || {} };
}

module.exports = {
  findEntityByIdTx,
  readItemByIdTx,
};
