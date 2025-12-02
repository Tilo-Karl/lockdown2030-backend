// ld2030/v1/move-player.js
// Mounts POST /api/ld2030/v1/move-player
module.exports = function registerMovePlayer(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/move-player`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030', dx = 0, dy = 0 } = req.body || {};
      if (!uid) {
        return res.status(400).json({ ok: false, error: 'uid_required' });
      }

      // IMPORTANT: engine here is the composite from engine/index.js.
      // We must use its router, not call processAction directly.
      const result = await engine.router.handleMove({
        uid,
        gameId,
        dx,
        dy,
      });

      // Return whatever the engine decided (includes ok + pos etc.)
      return res.json(result);
    } catch (e) {
      console.error('move-player error', e);
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });
};