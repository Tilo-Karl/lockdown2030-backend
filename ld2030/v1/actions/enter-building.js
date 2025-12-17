// ld2030/v1/actions/enter-building.js
// POST /enter-building
// Explicit action: toggles player into "inside building" state (and ensures z=0 if missing).
// Validation + AP spend happens inside engine/router.

module.exports = function registerEnterBuilding(app, { engine, base }) {
  if (!app) throw new Error('enter-building: app is required');
  if (!engine || !engine.router) throw new Error('enter-building: engine.router is required');
  if (!base) throw new Error('enter-building: base is required');

  app.post(`${base}/enter-building`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });

      const result = await engine.router.handleEnterBuilding({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('enter-building error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'enter_failed') });
    }
  });
};