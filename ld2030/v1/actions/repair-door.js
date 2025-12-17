// ld2030/v1/repair-door.js
// Mounts POST /api/ld2030/v1/actions/repair-door
module.exports = function registerRepairDoor(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/repair-door`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await engine.router.handleRepairDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('repair-door error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'repair_door_failed') });
    }
  });
};
