// ld2030/v1/init-game.js
// Mounts POST /api/ld2030/v1/init-game

const { GRID, MAP } = require('./config');

module.exports = function registerInitGame(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/init-game`, async (req, res) => {
    try {
      const {
        gameId = 'lockdown2030',      // real game, not MVP
        mapId  = MAP.DEFAULT_ID,      // from config (e.g. "world-1")
        w      = undefined,           // optional override
        h      = undefined,           // optional override
        seed   = Math.floor(Date.now() % 1_000_000_000),
        force  = false,
      } = req.body || {};

      // Decide final grid size:
      // 1) If request provides w/h, use that (within bounds).
      // 2) Else if GRID.USE_RANDOM is true, pick a random preset.
      // 3) Else fall back to GRID.DEFAULT_W / GRID.DEFAULT_H.
      let width;
      let height;

      if (typeof w === 'number' && typeof h === 'number') {
        width = w;
        height = h;
      } else if (GRID.USE_RANDOM && typeof GRID.randomSize === 'function') {
        const pick = GRID.randomSize();
        width = pick.w;
        height = pick.h;
      } else {
        width = GRID.DEFAULT_W;
        height = GRID.DEFAULT_H;
      }

      if (!gameId || !mapId) {
        return res.status(400).json({ ok: false, error: 'missing_ids' });
      }

      // Use grid bounds from config
      if (
        width < GRID.MIN_W || height < GRID.MIN_H ||
        width > GRID.MAX_W || height > GRID.MAX_W
      ) {
        return res.status(400).json({ ok: false, error: 'invalid_size' });
      }

      // Generate and write map + metadata
      await state.writeMapAndGame({
        gameId,
        mapId,
        w: width,
        h: height,
        seed,
        force,
      });

      console.log(
        `[init-game] Game '${gameId}' initialized (${width}x${height}) mapId=${mapId}`
      );

      return res.json({ ok: true, gameId, mapId, w: width, h: height, seed });

    } catch (e) {
      console.error('init-game error', e);
      return res.status(500).json({ ok: false, error: 'internal' });
    }
  });
};