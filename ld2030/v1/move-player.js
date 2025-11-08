// Mounts POST /api/ld2030/v1/move-player
module.exports = function registerMovePlayer(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/move-player`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030', dx = 0, dy = 0 } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

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

      return res.json({ ok: true });
    } catch (e) {
      console.error('move-player error', e);
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });
};