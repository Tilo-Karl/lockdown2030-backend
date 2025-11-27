// ld2030/v1/init-game.js
// Mounts POST /api/ld2030/v1/init-game

const { GRID, MAP } = require('./game-config');

module.exports = function registerInitGame(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/init-game`, async (req, res) => {
    try {
      const {
        gameId = 'lockdown2030',      // real game, not MVP
        mapId  = MAP.DEFAULT_ID,      // from config (e.g. "world-1")
        w      = GRID.DEFAULT_W,      // default world size from config
        h      = GRID.DEFAULT_H,
        seed   = Math.floor(Date.now() % 1_000_000_000),
        force  = false,
      } = req.body || {};

      if (!gameId || !mapId) {
        return res.status(400).json({ ok: false, error: 'missing_ids' });
      }

      // Use grid bounds from config
      if (
        w < GRID.MIN_W || h < GRID.MIN_H ||
        w > GRID.MAX_W || h > GRID.MAX_H
      ) {
        return res.status(400).json({ ok: false, error: 'invalid_size' });
      }

      // Generate and write map + metadata
      await state.writeMapAndGame({
        gameId,
        mapId,
        w,
        h,
        seed,
        force,
      });


      console.log(
        `[init-game] Game '${gameId}' initialized (${w}x${h}) mapId=${mapId}`
      );

      return res.json({ ok: true, gameId, mapId, w, h, seed });

    } catch (e) {
      console.error('init-game error', e);
      return res.status(500).json({ ok: false, error: 'internal' });
    }
  });
};