// ld2030/v1/engine/state-writer-core.js
// Core writes: move, generic updates, game meta.
// Improvement:
// - Always stamp updatedAt.
// - Ensure createdAt exists (set once if missing) for all entity doc writes.

module.exports = function makeCoreStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-core: db is required');
  if (!admin) throw new Error('state-writer-core: admin is required');
  if (!state) throw new Error('state-writer-core: state is required');

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

  /** Move a player by (dx, dy) and stamp updatedAt. Preserves z. */
  async function movePlayer(gameId, uid, dx, dy) {
    const ref = state.playersCol(gameId).doc(uid);

    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);

      const snap = await tx.get(ref);
      const cur = snap.exists ? (snap.data() || {}) : {};

      const pos = cur.pos || { x: 0, y: 0, z: 0 };
      const curZ = Number.isFinite(pos.z) ? Number(pos.z) : 0;

      const newX = (pos.x ?? 0) + Number(dx);
      const newY = (pos.y ?? 0) + Number(dy);

      tx.set(
        ref,
        {
          pos: { x: newX, y: newY, z: curZ },
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  /** Generic helper: merge data into a player doc. */
  async function updatePlayer(gameId, uid, data) {
    const ref = state.playersCol(gameId).doc(uid);
    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);
      tx.set(
        ref,
        {
          ...data,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });
    return { ok: true };
  }

  /** Generic helper: merge data into a zombie doc. */
  async function updateZombie(gameId, zombieId, data) {
    const ref = state.zombiesCol(gameId).doc(zombieId);
    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);
      tx.set(
        ref,
        {
          ...data,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });
    return { ok: true };
  }

  /** Generic helper: merge data into a human actor doc (humans collection). */
  async function updateHuman(gameId, humanId, data) {
    const ref = state.humansCol(gameId).doc(humanId);
    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);
      tx.set(
        ref,
        {
          ...data,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });
    return { ok: true };
  }

  /** Generic helper: merge data into an item doc. */
  async function updateItem(gameId, itemId, data) {
    const ref = state.itemsCol(gameId).doc(itemId);
    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);
      tx.set(
        ref,
        {
          ...data,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });
    return { ok: true };
  }

  /** Merge data into a door doc: games/{gameId}/doors/{doorId}. */
  async function updateDoor(gameId, doorId, data) {
    if (typeof state.doorsCol !== 'function') throw new Error('updateDoor: doorsCol not available');
    const ref = state.doorsCol(gameId).doc(doorId);

    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);
      tx.set(
        ref,
        {
          doorId,
          ...data,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  /** Search / scavenge a per-tile-per-floor spot (depletion tracked on the spot doc). */
  async function searchSpot({
    gameId,
    uid,
    spotId,
    pos,
    isInsideBuilding,
    apCost = 1,
    defaultRemaining = 3,
  }) {
    if (!gameId) throw new Error('searchSpot: missing_gameId');
    if (!uid) throw new Error('searchSpot: missing_uid');
    if (!spotId) throw new Error('searchSpot: missing_spotId');

    const playerRef = state.playersCol(gameId).doc(uid);
    const spotRef = state.spotsCol(gameId).doc(spotId);

    let out = null;

    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, playerRef);
      await ensureCreatedAtTx(tx, spotRef);

      const pSnap = await tx.get(playerRef);
      if (!pSnap.exists) throw new Error('SEARCH: actor_not_found');
      const actor = pSnap.data() || {};

      const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
      if (curAp < apCost) throw new Error('SEARCH: not_enough_ap');

      const sSnap = await tx.get(spotRef);
      const spot = sSnap.exists ? (sSnap.data() || {}) : {};

      const maxRemaining = Number.isFinite(spot.maxRemaining) ? spot.maxRemaining : defaultRemaining;
      const remaining = Number.isFinite(spot.remaining) ? spot.remaining : maxRemaining;
      if (remaining <= 0) throw new Error('SEARCH: spot_depleted');

      const nextRemaining = remaining - 1;
      const nextAp = Math.max(0, curAp - apCost);

      tx.set(
        playerRef,
        {
          currentAp: nextAp,
          updatedAt: serverTs(),
        },
        { merge: true }
      );

      tx.set(
        spotRef,
        {
          spotId,
          pos: {
            x: Number(pos?.x) || 0,
            y: Number(pos?.y) || 0,
            z: Number.isFinite(pos?.z) ? Number(pos.z) : 0,
          },
          isInsideBuilding: isInsideBuilding === true,
          maxRemaining,
          remaining: nextRemaining,
          searchedCount: (Number.isFinite(spot.searchedCount) ? spot.searchedCount : 0) + 1,
          updatedAt: serverTs(),
        },
        { merge: true }
      );

      out = {
        ok: true,
        spotId,
        apCost,
        currentAp: nextAp,
        remaining: nextRemaining,
        maxRemaining,
      };
    });

    return out || { ok: true, spotId };
  }

  /** Merge game-level metadata into games/{gameId}. */
  async function writeGameMeta(gameId, newMeta) {
    const ref = state.gameRef(gameId);
    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);
      tx.set(
        ref,
        {
          ...newMeta,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });
    return { ok: true };
  }

  return {
    movePlayer,
    updatePlayer,
    updateZombie,
    updateHuman,
    updateItem,
    updateDoor,
    searchSpot,
    writeGameMeta,
  };
};