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

  /** Move a player by (dx, dy) and stamp updatedAt. */
  async function movePlayer(gameId, uid, dx, dy) {
    const ref = state.playersCol(gameId).doc(uid);

    await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, ref);

      const snap = await tx.get(ref);
      const cur = snap.exists ? (snap.data() || {}) : {};

      const pos = cur.pos || { x: 0, y: 0 };
      const newX = (pos.x ?? 0) + Number(dx);
      const newY = (pos.y ?? 0) + Number(dy);

      tx.set(
        ref,
        {
          pos: { x: newX, y: newY },
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

  /** Generic helper: merge data into a human actor doc (npcs collection). */
  async function updateNpc(gameId, npcId, data) {
    const ref = state.npcsCol(gameId).doc(npcId);
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
    updateNpc,
    updateItem,
    writeGameMeta,
  };
};