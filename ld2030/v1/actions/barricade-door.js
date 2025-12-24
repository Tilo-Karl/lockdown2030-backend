// ld2030/v1/actions/barricade-door.js
// POST /barricade-door
// Uses action-router helpers (not engine.processAction).

module.exports = function registerBarricadeDoor(app, { actions, base } = {}) {
  if (!app) throw new Error('barricade-door: app is required');
  if (!actions || typeof actions.handleBarricadeDoor !== 'function') {
    throw new Error('barricade-door: actions.handleBarricadeDoor is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('barricade-door: base is required');

  app.post(`${BASE}/barricade-door`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleBarricadeDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('barricade-door error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'barricade_door_failed') });
    }
  });
};