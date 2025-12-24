// ld2030/v1/actions/enter-building.js
// POST /enter-building
// Uses action-router helpers (not engine.processAction).

module.exports = function registerEnterBuilding(app, { actions, base } = {}) {
  if (!app) throw new Error('enter-building: app is required');
  if (!actions || typeof actions.handleEnterBuilding !== 'function') {
    throw new Error('enter-building: actions.handleEnterBuilding is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('enter-building: base is required');

  app.post(`${BASE}/enter-building`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleEnterBuilding({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('enter-building error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'enter_building_failed') });
    }
  });
};