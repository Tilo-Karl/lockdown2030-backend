// ld2030/v1/engine/state-writer-core.js
// Core writes (Big Bang V1):
// - runtime world: cells/*, edges/*
//
// FIX: edgeId is enforced by writer (data.edgeId can NOT override it).
// ADD: updateActorAndEdgeAtomic (actor currentAp + edge write in ONE tx)

const makeTx = require('./tx');
const { findActorByIdTx } = require('./actor-tx-helpers');

module.exports = function makeCoreStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-core: db is required');
  if (!admin) throw new Error('state-writer-core: admin is required');
  if (!state) throw new Error('state-writer-core: state is required');

  const txHelpers = makeTx({ db, admin });
  const { run, setWithMeta } = txHelpers;

  function gameRef(gameId) {
    return (state && typeof state.gameRef === 'function')
      ? state.gameRef(gameId)
      : db.collection('games').doc(String(gameId));
  }

  function cellsCol(gameId) {
    if (typeof state.cellsCol === 'function') return state.cellsCol(gameId);
    return gameRef(gameId).collection('cells');
  }
  function edgesCol(gameId) {
    if (typeof state.edgesCol === 'function') return state.edgesCol(gameId);
    return gameRef(gameId).collection('edges');
  }
  function districtStateCol(gameId) {
    if (typeof state.districtStateCol === 'function') return state.districtStateCol(gameId);
    return gameRef(gameId).collection('districtState');
  }
  function noiseTilesCol(gameId) {
    if (typeof state.noiseTilesCol === 'function') return state.noiseTilesCol(gameId);
    return gameRef(gameId).collection('noiseTiles');
  }

  async function movePlayer(gameId, uid, dx, dy) {
    const ref = state.playersCol(gameId).doc(uid);

    await run('movePlayer', async (txn) => {
      const snap = await txn.get(ref);

      const cur = snap.exists ? (snap.data() || {}) : {};
      const pos = cur.pos || { x: 0, y: 0, z: 0, layer: 0 };
      const newX = (pos.x ?? 0) + Number(dx);
      const newY = (pos.y ?? 0) + Number(dy);

      setWithMeta(
        txn,
        ref,
        {
          pos: {
            x: newX,
            y: newY,
            z: Number.isFinite(pos.z) ? pos.z : 0,
            layer: Number.isFinite(pos.layer) ? pos.layer : 0,
          },
        },
        snap
      );
    });

    return { ok: true };
  }

  async function updatePlayer(gameId, uid, data) {
    const ref = state.playersCol(gameId).doc(uid);
    await run('updatePlayer', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, data, snap);
    });
    return { ok: true };
  }

  async function updateZombie(gameId, zombieId, data) {
    const ref = state.zombiesCol(gameId).doc(zombieId);
    await run('updateZombie', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, data, snap);
    });
    return { ok: true };
  }

  async function updateHuman(gameId, humanId, data) {
    const ref = state.humansCol(gameId).doc(humanId);
    await run('updateHuman', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, data, snap);
    });
    return { ok: true };
  }

  async function updateItem(gameId, itemId, data) {
    const ref = state.itemsCol(gameId).doc(itemId);
    await run('updateItem', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, data, snap);
    });
    return { ok: true };
  }

  async function updateActor(gameId, actorId, data) {
    const id = String(actorId);

    await run('updateActor', async (txn) => {
      const found = await findActorByIdTx({ tx: txn, state, gameId, actorId: id });
      if (!found) throw new Error('updateActor: actor_not_found');

      setWithMeta(txn, found.ref, data, found.snap);
    });

    return { ok: true };
  }

  // ATOMIC: update actor + one edge in the same tx (AP spending + barricade/door change)
  async function updateActorAndEdgeAtomic(gameId, actorId, actorPatch, edgeId, edgePatch) {
    const aId = String(actorId);
    const eId = String(edgeId);

    await run('updateActorAndEdgeAtomic', async (txn) => {
      const found = await findActorByIdTx({ tx: txn, state, gameId, actorId: aId });
      if (!found) throw new Error('updateActorAndEdgeAtomic: actor_not_found');

      const edgeRef = edgesCol(gameId).doc(eId);
      const edgeSnap = await txn.get(edgeRef);

      setWithMeta(txn, found.ref, { ...(actorPatch || {}) }, found.snap);

      // IMPORTANT: enforce edgeId (edgePatch.edgeId cannot override)
      setWithMeta(txn, edgeRef, { ...(edgePatch || {}), edgeId: eId }, edgeSnap);
    });

    return { ok: true };
  }

  async function updateCell(gameId, cellId, data) {
    const id = String(cellId);
    const ref = cellsCol(gameId).doc(id);
    await run('updateCell', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, { ...data, cellId: id }, snap);
    });
    return { ok: true };
  }

  async function updateEdge(gameId, edgeId, data) {
    const id = String(edgeId);
    const ref = edgesCol(gameId).doc(id);
    await run('updateEdge', async (txn) => {
      const snap = await txn.get(ref);
      // IMPORTANT: enforce edgeId (data.edgeId cannot override)
      setWithMeta(txn, ref, { ...data, edgeId: id }, snap);
    });
    return { ok: true };
  }

  async function updateDoor(gameId, edgeId, data) {
    return updateEdge(gameId, edgeId, { kind: 'door', ...data });
  }

  async function updateStairEdge(gameId, edgeId, data) {
    return updateEdge(gameId, edgeId, { kind: 'stairs', ...data });
  }

  async function updateDistrictState(gameId, districtId, data) {
    const id = String(districtId);
    const ref = districtStateCol(gameId).doc(id);
    await run('updateDistrictState', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, { ...data, districtId: id }, snap);
    });
    return { ok: true };
  }

  async function updateNoiseTile(gameId, noiseTileId, data) {
    const id = String(noiseTileId);
    const ref = noiseTilesCol(gameId).doc(id);
    await run('updateNoiseTile', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, data, snap);
    });
    return { ok: true };
  }

  async function writeGameMeta(gameId, newMeta) {
    const ref = gameRef(gameId);
    await run('writeGameMeta', async (txn) => {
      const snap = await txn.get(ref);
      setWithMeta(txn, ref, newMeta, snap);
    });
    return { ok: true };
  }

  return {
    movePlayer,

    // legacy
    updatePlayer,
    updateZombie,
    updateHuman,
    updateItem,

    // unified actor write
    updateActor,

    // atomic actor+edge
    updateActorAndEdgeAtomic,

    updateCell,
    updateEdge,
    updateDoor,
    updateStairEdge,
    updateDistrictState,
    updateNoiseTile,

    writeGameMeta,
  };
};
