// ld2030/v1/engine/state-writer-core.js
// Core writes: move, generic updates, game meta.

module.exports = function makeCoreStateWriter({ db, admin, state }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  /** Move a player by (dx, dy) and stamp updatedAt. */
  async function movePlayer(gameId, uid, dx, dy) {
    const ref = state.playersCol(gameId).doc(uid);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const cur = snap.exists
        ? snap.data()
        : {
            pos: { x: 0, y: 0 },
            hp: 100,
            ap: 3,
            alive: true,
          };

      const newX = (cur.pos?.x ?? 0) + Number(dx);
      const newY = (cur.pos?.y ?? 0) + Number(dy);

      tx.set(
        ref,
        {
          ...cur,
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
    await state.playersCol(gameId).doc(uid).set(
      {
        ...data,
        updatedAt: serverTs(),
      },
      { merge: true }
    );
    return { ok: true };
  }

  /** Generic helper: merge data into a zombie doc. */
  async function updateZombie(gameId, zombieId, data) {
    await state.zombiesCol(gameId).doc(zombieId).set(
      {
        ...data,
        updatedAt: serverTs(),
      },
      { merge: true }
    );
    return { ok: true };
  }

  /** Generic helper: merge data into an NPC doc. */
  async function updateNpc(gameId, npcId, data) {
    await state.npcsCol(gameId).doc(npcId).set(
      {
        ...data,
        updatedAt: serverTs(),
      },
      { merge: true }
    );
    return { ok: true };
  }

  /** Generic helper: merge data into an item doc. */
  async function updateItem(gameId, itemId, data) {
    await state.itemsCol(gameId).doc(itemId).set(
      {
        ...data,
        updatedAt: serverTs(),
      },
      { merge: true }
    );
    return { ok: true };
  }

  /** Merge game-level metadata into games/{gameId}. */
  async function writeGameMeta(gameId, newMeta) {
    await state.gameRef(gameId).set(
      {
        ...newMeta,
        updatedAt: serverTs(),
      },
      { merge: true }
    );
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