// ld2030/v1/engine/state-writer-core.js
// Core writes: move, generic updates, game meta.
// Improvement:
// - Always stamp updatedAt.
// - Ensure createdAt exists (set once if missing) for all entity doc writes.
// - Preserve pos.z when callers update pos with only {x,y} (Firestore map merge replaces the whole map).

module.exports = function makeCoreStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-core: db is required');
  if (!admin) throw new Error('state-writer-core: admin is required');
  if (!state) throw new Error('state-writer-core: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  function toInt(n, fallback = 0) {
    const x = Number(n);
    return Number.isFinite(x) ? Math.trunc(x) : fallback;
  }

  function normalizePos(existingPos, patchPos) {
    if (!patchPos || typeof patchPos !== 'object') return undefined;

    const ex = (existingPos && typeof existingPos === 'object') ? existingPos : {};
    const px = toInt(patchPos.x, toInt(ex.x, 0));
    const py = toInt(patchPos.y, toInt(ex.y, 0));

    // If caller didn't provide z, preserve existing z (default 0).
    const z =
      Number.isFinite(patchPos.z) ? toInt(patchPos.z, 0) :
      Number.isFinite(ex.z) ? toInt(ex.z, 0) :
      0;

    // Preserve any future extra keys on pos while enforcing x/y/z
    return {
      ...ex,
      ...patchPos,
      x: px,
      y: py,
      z,
    };
  }

  async function ensureCreatedAtTx(tx, ref) {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      tx.set(ref, { createdAt: serverTs() }, { merge: true });
      return { exists: false, data: {} };
    }

    const data = snap.data() || {};
    if (data.createdAt == null) {
      tx.set(ref, { createdAt: serverTs() }, { merge: true });
    }

    return { exists: true, data };
  }

  /** Move a player by (dx, dy) and stamp updatedAt. (Legacy helper; keep z intact.) */
  async function movePlayer(gameId, uid, dx, dy) {
    const ref = state.playersCol(gameId).doc(uid);

    await db.runTransaction(async (tx) => {
      const curSnap = await ensureCreatedAtTx(tx, ref);
      const cur = curSnap.data || {};

      const pos = (cur.pos && typeof cur.pos === 'object') ? cur.pos : { x: 0, y: 0, z: 0 };
      const newX = toInt(pos.x, 0) + toInt(dx, 0);
      const newY = toInt(pos.y, 0) + toInt(dy, 0);

      const nextPos = normalizePos(pos, { x: newX, y: newY });

      tx.set(
        ref,
        {
          pos: nextPos,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  /** Generic helper: merge data into a player doc. (Preserve pos.z on partial pos patches.) */
  async function updatePlayer(gameId, uid, data) {
    const ref = state.playersCol(gameId).doc(uid);

    await db.runTransaction(async (tx) => {
      const curSnap = await ensureCreatedAtTx(tx, ref);
      const cur = curSnap.data || {};

      const patch = { ...data };

      if (Object.prototype.hasOwnProperty.call(data || {}, 'pos')) {
        patch.pos = normalizePos(cur.pos, data.pos);
      }

      tx.set(
        ref,
        {
          ...patch,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return { ok: true };
  }

  /** Generic helper: merge data into a zombie doc. (Preserve pos.z on partial pos patches.) */
  async function updateZombie(gameId, zombieId, data) {
    const ref = state.zombiesCol(gameId).doc(zombieId);

    await db.runTransaction(async (tx) => {
      const curSnap = await ensureCreatedAtTx(tx, ref);
      const cur = curSnap.data || {};

      const patch = { ...data };

      if (Object.prototype.hasOwnProperty.call(data || {}, 'pos')) {
        patch.pos = normalizePos(cur.pos, data.pos);
      }

      tx.set(
        ref,
        {
          ...patch,
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
      const curSnap = await ensureCreatedAtTx(tx, ref);
      const cur = curSnap.data || {};

      const patch = { ...data };

      if (Object.prototype.hasOwnProperty.call(data || {}, 'pos')) {
        patch.pos = normalizePos(cur.pos, data.pos);
      }

      tx.set(
        ref,
        {
          ...patch,
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
      const curSnap = await ensureCreatedAtTx(tx, ref);
      const cur = curSnap.data || {};

      const patch = { ...data };

      if (Object.prototype.hasOwnProperty.call(data || {}, 'pos')) {
        patch.pos = normalizePos(cur.pos, data.pos);
      }

      tx.set(
        ref,
        {
          ...patch,
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
    searchSpot,
    writeGameMeta,
  };
};