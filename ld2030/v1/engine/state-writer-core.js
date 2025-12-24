// ld2030/v1/engine/state-writer-core.js
// Core writes (Big Bang V1):
// - runtime world: cells/*, edges/*
//
// FIX: edgeId is enforced by writer (data.edgeId can NOT override it).
// ADD: updateActorAndEdgeAtomic (actor currentAp + edge write in ONE tx)

module.exports = function makeCoreStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-core: db is required');
  if (!admin) throw new Error('state-writer-core: admin is required');
  if (!state) throw new Error('state-writer-core: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

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

  function metaPatchForSnap(snap) {
    const ts = serverTs();
    const cur = snap.exists ? (snap.data() || {}) : {};
    const meta = { updatedAt: ts };
    if (!snap.exists || cur.createdAt == null) meta.createdAt = ts;
    return meta;
  }

  async function findActorByIdTx(tx, gameId, actorId) {
    const id = String(actorId);
    const cols = [
      { label: 'players', col: state.playersCol(gameId) },
      { label: 'zombies', col: state.zombiesCol(gameId) },
      { label: 'humans',  col: state.humansCol(gameId) },
    ];

    for (const c of cols) {
      const ref = c.col.doc(id);
      const snap = await tx.get(ref);
      if (snap.exists) return { ref, label: c.label, snap, data: (snap.data() || {}) };
    }
    return null;
  }

  async function movePlayer(gameId, uid, dx, dy) {
    const ref = state.playersCol(gameId).doc(uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);

      const cur = snap.exists ? (snap.data() || {}) : {};
      const pos = cur.pos || { x: 0, y: 0, z: 0, layer: 0 };
      const newX = (pos.x ?? 0) + Number(dx);
      const newY = (pos.y ?? 0) + Number(dy);

      tx.set(
        ref,
        {
          pos: { x: newX, y: newY, z: Number.isFinite(pos.z) ? pos.z : 0, layer: Number.isFinite(pos.layer) ? pos.layer : 0 },
          ...meta,
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  async function updatePlayer(gameId, uid, data) {
    const ref = state.playersCol(gameId).doc(uid);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...data, ...meta }, { merge: true });
    });
    return { ok: true };
  }

  async function updateZombie(gameId, zombieId, data) {
    const ref = state.zombiesCol(gameId).doc(zombieId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...data, ...meta }, { merge: true });
    });
    return { ok: true };
  }

  async function updateHuman(gameId, humanId, data) {
    const ref = state.humansCol(gameId).doc(humanId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...data, ...meta }, { merge: true });
    });
    return { ok: true };
  }

  async function updateItem(gameId, itemId, data) {
    const ref = state.itemsCol(gameId).doc(itemId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...data, ...meta }, { merge: true });
    });
    return { ok: true };
  }

  async function updateActor(gameId, actorId, data) {
    const id = String(actorId);

    await db.runTransaction(async (tx) => {
      const found = await findActorByIdTx(tx, gameId, id);
      if (!found) throw new Error('updateActor: actor_not_found');

      const meta = metaPatchForSnap(found.snap);
      tx.set(found.ref, { ...data, ...meta }, { merge: true });
    });

    return { ok: true };
  }

  // ATOMIC: update actor + one edge in the same tx (AP spending + barricade/door change)
  async function updateActorAndEdgeAtomic(gameId, actorId, actorPatch, edgeId, edgePatch) {
    const aId = String(actorId);
    const eId = String(edgeId);

    await db.runTransaction(async (tx) => {
      const found = await findActorByIdTx(tx, gameId, aId);
      if (!found) throw new Error('updateActorAndEdgeAtomic: actor_not_found');

      const edgeRef = edgesCol(gameId).doc(eId);
      const edgeSnap = await tx.get(edgeRef);

      const actorMeta = metaPatchForSnap(found.snap);
      const edgeMeta = metaPatchForSnap(edgeSnap);

      tx.set(found.ref, { ...(actorPatch || {}), ...actorMeta }, { merge: true });

      // IMPORTANT: enforce edgeId (edgePatch.edgeId cannot override)
      tx.set(edgeRef, { ...(edgePatch || {}), edgeId: eId, ...edgeMeta }, { merge: true });
    });

    return { ok: true };
  }

  async function updateCell(gameId, cellId, data) {
    const id = String(cellId);
    const ref = cellsCol(gameId).doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...data, cellId: id, ...meta }, { merge: true });
    });
    return { ok: true };
  }

  async function updateEdge(gameId, edgeId, data) {
    const id = String(edgeId);
    const ref = edgesCol(gameId).doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      // IMPORTANT: enforce edgeId (data.edgeId cannot override)
      tx.set(ref, { ...data, edgeId: id, ...meta }, { merge: true });
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
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...data, districtId: id, ...meta }, { merge: true });
    });
    return { ok: true };
  }

  async function updateNoiseTile(gameId, noiseTileId, data) {
    const id = String(noiseTileId);
    const ref = noiseTilesCol(gameId).doc(id);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...data, ...meta }, { merge: true });
    });
    return { ok: true };
  }

  async function writeGameMeta(gameId, newMeta) {
    const ref = gameRef(gameId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const meta = metaPatchForSnap(snap);
      tx.set(ref, { ...newMeta, ...meta }, { merge: true });
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