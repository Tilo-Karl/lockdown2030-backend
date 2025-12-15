// ld2030/v1/join-game.js
// Mounts POST /api/ld2030/v1/join-game
//
// New schema:
// - players docs are ACTORs: type/kind/isPlayer/maxHp/maxAp/currentHp/currentAp
// - stamps createdAt once + updatedAt always
// - NO legacy hp/ap/baseHp/baseAp

const { GRID } = require('./config');
const { resolveEntityConfig } = require('./entity');

const serverTs = (admin) => admin.firestore.FieldValue.serverTimestamp();

// Resolve HUMAN/PLAYER template (caps/defaults live in templates)
const PLAYER_CFG = resolveEntityConfig('HUMAN', 'PLAYER') || {};
const START_MAX_HP = Number.isFinite(PLAYER_CFG.maxHp) ? PLAYER_CFG.maxHp : 100;
const START_MAX_AP = Number.isFinite(PLAYER_CFG.maxAp) ? PLAYER_CFG.maxAp : 3;

module.exports = function registerJoinGame(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';

  // pick an empty tile inside [0..w-1] × [0..h-1]
  async function pickSpawnTx(tx, gameId, w, h) {
    const tries = 50;
    for (let i = 0; i < tries; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);

      const q = state
        .playersCol(gameId)
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
      if (!gameId || !uid) {
        return res.status(400).json({ ok: false, reason: 'missing_fields' });
      }

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

        // Canonical actor fields for a player
        const maxHp = START_MAX_HP;
        const maxAp = START_MAX_AP;

        // If already alive + has a valid pos, keep it
        if (pDoc.exists) {
          const p = pDoc.data() || {};
          const hasPosInts =
            p.pos &&
            Number.isInteger(p.pos.x) &&
            Number.isInteger(p.pos.y);

          if (p.alive !== false && hasPosInts) {
            // Clamp existing pos into the CURRENT grid so old/out-of-range docs don't break.
            const clampedPos = {
              x: Math.min(Math.max(p.pos.x, 0), w - 1),
              y: Math.min(Math.max(p.pos.y, 0), h - 1),
            };

            // Ensure createdAt exists, and enforce player actor discriminators + caps.
            const patch = {
              userId: uid,
              displayName: displayName ?? p.displayName ?? 'Player',
              type: 'HUMAN',
              kind: 'PLAYER',
              isPlayer: true,
              alive: true,
              pos: clampedPos,
              maxHp,
              maxAp,
              // Don’t invent values if they already exist; only initialize if missing.
              currentHp: Number.isFinite(p.currentHp) ? Math.min(p.currentHp, maxHp) : maxHp,
              currentAp: Number.isFinite(p.currentAp) ? Math.min(p.currentAp, maxAp) : maxAp,
              updatedAt: serverTs(admin),
            };

            if (p.createdAt == null) patch.createdAt = serverTs(admin);

            tx.set(pRef, patch, { merge: true });

            return {
              x: clampedPos.x,
              y: clampedPos.y,
              maxHp,
              maxAp,
              currentHp: patch.currentHp,
              currentAp: patch.currentAp,
            };
          }
        }

        // Otherwise spawn fresh
        const spawn = await pickSpawnTx(tx, gameId, w, h);

        const payload = {
          userId: uid,
          displayName: displayName ?? 'Player',
          pos: spawn,

          // Canonical actor discriminators
          type: 'HUMAN',
          kind: 'PLAYER',
          isPlayer: true,

          alive: true,

          // Canonical runtime stats
          maxHp,
          maxAp,
          currentHp: maxHp,
          currentAp: maxAp,

          createdAt: serverTs(admin),
          updatedAt: serverTs(admin),
        };

        tx.set(pRef, payload, { merge: true });

        // Optional lightweight marker doc (kept)
        const logRef = state.playersCol(gameId).doc('_logs');
        tx.set(logRef, { lastJoinAt: serverTs(admin) }, { merge: true });

        return {
          x: spawn.x,
          y: spawn.y,
          maxHp,
          maxAp,
          currentHp: maxHp,
          currentAp: maxAp,
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