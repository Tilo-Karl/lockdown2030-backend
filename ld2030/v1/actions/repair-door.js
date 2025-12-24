// ld2030/v1/actions/repair-door.js
// POST /repair-door
// Uses action-router helpers (not engine.processAction).

module.exports = function registerRepairDoor(app, { actions, base } = {}) {
  if (!app) throw new Error('repair-door: app is required');
  if (!actions || typeof actions.handleRepairDoor !== 'function') {
    throw new Error('repair-door: actions.handleRepairDoor is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('repair-door: base is required');

  app.post(`${BASE}/repair-door`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleRepairDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('repair-door error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'repair_door_failed') });
    }
  });
};