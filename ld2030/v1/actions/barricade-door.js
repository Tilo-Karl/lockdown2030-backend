// ld2030/v1/barricade-door.js
// Mounts POST /api/ld2030/v1/actions/barricade-door
module.exports = function registerBarricadeDoor(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/barricade-door`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await engine.router.handleBarricadeDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('barricade-door error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'barricade_door_failed') });
    }
  });
};