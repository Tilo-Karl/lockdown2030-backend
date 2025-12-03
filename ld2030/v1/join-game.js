// ld2030/v1/join-game.js
// Mounts POST /api/ld2030/v1/join-game

const { GRID, PLAYER } = require('./config');

module.exports = function registerJoinGame(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';

  // pick an empty tile inside [0..w-1] × [0..h-1]
  async function pickSpawnTx(tx, gameId, w, h) {
    const tries = 50;
    for (let i = 0; i < tries; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);
      const q = state.playersCol(gameId)
        .where('pos.x', '==', x)
        .where('pos.y', '==', y)
        .limit(1);
      const snap = await tx.get(q);
      if (snap.empty) return { x, y };
    }
    return { x: 0, y: 0 }; // fallback
  }

  app.post(`${BASE}/join-game`, async (req, res) => {
    try {
      const { gameId = 'lockdown2030', uid, displayName } = req.body || {};
      if (!gameId || !uid)
        return res.status(400).json({ ok: false, reason: 'missing_fields' });

      const result = await db.runTransaction(async (tx) => {
        const gRef = state.gameRef(gameId);
        const gDoc = await tx.get(gRef);
        if (!gDoc.exists) throw new Error('game_not_found');

        const g = gDoc.data() || {};

        // Use grid from game doc, fall back to config defaults
        const w = g.gridsize?.w ?? g.w ?? GRID.DEFAULT_W;
        const h = g.gridsize?.h ?? g.h ?? GRID.DEFAULT_H;

        const pRef = state.playersCol(gameId).doc(uid);
        const pDoc = await tx.get(pRef);

        // If already alive, keep position
        if (pDoc.exists) {
          const p = pDoc.data() || {};
          if (p.alive !== false && p.pos && Number.isInteger(p.pos.x) && Number.isInteger(p.pos.y)) {
            tx.set(
              pRef,
              {
                displayName: displayName ?? p.displayName ?? 'Player',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
            return {
              x: p.pos.x,
              y: p.pos.y,
              hp: p.hp ?? PLAYER.START_HP,
              ap: p.ap ?? PLAYER.START_AP,
            };
          }
        }

        // Otherwise spawn fresh
        const spawn = await pickSpawnTx(tx, gameId, w, h);
        const payload = {
          userId: uid,
          displayName: displayName ?? 'Player',
          pos: spawn,
          hp: PLAYER.START_HP,
          ap: PLAYER.START_AP,
          alive: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        tx.set(pRef, payload, { merge: true });

        const logRef = state.playersCol(gameId).doc('_logs');
        tx.set(
          logRef,
          { lastJoinAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );

        return {
          x: spawn.x,
          y: spawn.y,
          hp: PLAYER.START_HP,
          ap: PLAYER.START_AP,
        };
      });

      console.log(`[join] Player ${uid} joined game ${gameId}`);
      return res.json({ ok: true, ...result });

    } catch (err) {
      console.error('join error:', err);
      return res.status(400).json({ ok: false, reason: err.message || 'error' });
    }
  });
};