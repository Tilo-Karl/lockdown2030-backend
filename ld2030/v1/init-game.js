// Mounts POST /api/ld2030/v1/init-game
module.exports = function registerInitGame(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/init-game`, async (req, res) => {
    try {
      const {
        gameId = 'lockdown2030', // ← real game, not MVP
        mapId  = 'world-1',      // you can rename later to something like "bangkok" etc.
        w = 32,                  // larger default world
        h = 32,
        seed  = Math.floor(Date.now() % 1_000_000_000),
        force = false,
      } = req.body || {};

      if (!gameId || !mapId)
        return res.status(400).json({ ok: false, error: 'missing_ids' });

      if (w < 4 || h < 4 || w > 256 || h > 256)
        return res.status(400).json({ ok: false, error: 'invalid_size' });

      // Generate and write map + metadata
      const { wroteMap } = await state.writeMapAndGame({ gameId, mapId, w, h, seed, force });

      console.log(`[init-game] Game '${gameId}' initialized (${w}x${h}) mapId=${mapId}`);
      return res.json({ ok: true, wroteMap, gameId, mapId, w, h, seed });

    } catch (e) {
      console.error('init-game error', e);
      return res.status(500).json({ ok: false, error: 'internal' });
    }
  });
};