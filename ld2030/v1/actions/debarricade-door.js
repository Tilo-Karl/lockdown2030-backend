// ld2030/v1/debarricade-door.js
// Mounts POST /api/ld2030/v1/actions/debarricade-door
module.exports = function registerDebarricadeDoor(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/debarricade-door`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await engine.router.handleDebarricadeDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('debarricade-door error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'debarricade_door_failed') });
    }
  });
};