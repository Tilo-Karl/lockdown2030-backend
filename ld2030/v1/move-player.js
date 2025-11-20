// Mounts POST /api/ld2030/v1/move-player
module.exports = function registerMovePlayer(app, { writer, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/move-player`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030', dx = 0, dy = 0 } = req.body || {};
      if (!uid) {
        return res.status(400).json({ ok: false, error: 'uid_required' });
      }

      await writer.movePlayer({ gameId, uid, dx, dy });

      return res.json({ ok: true });
    } catch (e) {
      console.error('move-player error', e);
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });
};