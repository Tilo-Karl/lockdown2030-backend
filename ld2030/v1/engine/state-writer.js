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

    async attackPlayer({ gameId = 'lockdown2030', attackerUid, targetUid, damage = 10, apCost = 1 }) {
      if (!attackerUid || !targetUid) {
        throw new Error('attackPlayer: attackerUid and targetUid are required');
      }

      const players = state.playersCol(gameId);
      const attackerRef = players.doc(attackerUid);
      const targetRef = players.doc(targetUid);

      await db.runTransaction(async (tx) => {
        const [attSnap, tgtSnap] = await Promise.all([
          tx.get(attackerRef),
          tx.get(targetRef),
        ]);

        if (!attSnap.exists || !tgtSnap.exists) {
          throw new Error('attackPlayer: player_not_found');
        }

        const attacker = attSnap.data() || {};
        const target = tgtSnap.data() || {};

        const curAp = attacker.ap ?? 0;
        if (curAp < apCost) {
          throw new Error('attackPlayer: not_enough_ap');
        }

        const newAp = curAp - apCost;
        const curHp = target.hp ?? 0;
        const newHp = Math.max(0, curHp - damage);

        tx.set(
          attackerRef,
          {
            ...attacker,
            ap: newAp,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          targetRef,
          {
            ...target,
            hp: newHp,
            alive: newHp > 0,
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