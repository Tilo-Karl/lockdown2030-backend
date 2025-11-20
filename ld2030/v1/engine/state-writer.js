// ld2030/v1/engine/state-writer.js
// Centralized writes/mutations to Firestore.

module.exports = function makeStateWriter({ db, admin, state }) {
  return {
    async movePlayer(gameId, uid, dx, dy) {
      const ref = state.playersCol(gameId).doc(uid);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists
          ? snap.data()
          : { pos: { x: 0, y: 0 }, hp: 100, ap: 3, alive: true };

        const newX = (cur.pos?.x ?? 0) + Number(dx);
        const newY = (cur.pos?.y ?? 0) + Number(dy);

        tx.set(
          ref,
          {
            ...cur,
            pos: { x: newX, y: newY },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      return { ok: true };
    },

    async updatePlayer(gameId, uid, data) {
      await state.playersCol(gameId).doc(uid).set(
        {
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true };
    },

    async writeGameMeta(gameId, newMeta) {
      await state.gameRef(gameId).set(
        {
          ...newMeta,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true };
    },
  };
};