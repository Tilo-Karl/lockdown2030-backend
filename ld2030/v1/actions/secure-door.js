// ld2030/v1/secure-door.js
// Mounts POST /api/ld2030/v1/actions/secure-door
module.exports = function registerSecureDoor(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/secure-door`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await engine.router.handleSecureDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('secure-door error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'secure_door_failed') });
    }
  });
};