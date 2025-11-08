// ld2030/v1/attack-player.js
// Mounts POST /api/ld2030/v1/attack-player
module.exports = function registerAttackPlayer(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/attack-player`, async (req, res) => {
    try {
      const { uid, targetUid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid || !targetUid) return res.status(400).json({ ok: false, error: 'uid_and_targetUid_required' });
      if (uid === targetUid)   return res.status(400).json({ ok: false, error: 'cannot_attack_self' });

      const players = state.playersCol(gameId);
      const aRef = players.doc(uid);
      const bRef = players.doc(targetUid);

      const result = await db.runTransaction(async (tx) => {
        const [aSnap, bSnap] = await Promise.all([tx.get(aRef), tx.get(bRef)]);
        if (!aSnap.exists || !bSnap.exists) throw new Error('player_not_found');

        const A = aSnap.data() || {};
        const B = bSnap.data() || {};
        if (A.alive === false || B.alive === false) throw new Error('not_alive');

        const sameTile =
          (A.pos?.x === B.pos?.x) &&
          (A.pos?.y === B.pos?.y);

        if (!sameTile) {
          // soft fail; not an exception
          return { ok: false, reason: 'not_on_same_tile' };
        }

        const dmg = 10;
        const ap  = Number(A.ap ?? 0);
        if (ap < 1) throw new Error('no_ap');

        const newHp = Math.max(0, Number(B.hp ?? 100) - dmg);

        tx.set(
          aRef,
          {
            ap: ap - 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          bRef,
          {
            hp: newHp,
            alive: newHp > 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return { ok: true, targetHp: newHp };
      });

      return res.json(result);
    } catch (e) {
      console.error('attack-player error:', e);
      return res.status(400).json({ ok: false, error: String(e.message || e) });
    }
  });
};