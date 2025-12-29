// ld2030/v1/engine/actor-tx-helpers.js
// Shared helpers for writer transactions (actor lookup + equipment ID collection).

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

async function findActorByIdTx({ tx, state, gameId, actorId }) {
  if (!tx) throw new Error('findActorByIdTx: tx required');
  if (!state) throw new Error('findActorByIdTx: state required');

  const cols = [
    state.playersCol(gameId),
    state.humansCol(gameId),
    state.zombiesCol(gameId),
  ];

  for (const col of cols) {
    const ref = col.doc(actorId);
    const snap = await tx.get(ref);
    if (snap.exists) return { ref, snap, data: snap.data() || {} };
  }
  return null;
}

module.exports = {
  listIdsDeep,
  findActorByIdTx,
};
