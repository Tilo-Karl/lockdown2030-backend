// ld2030/v1/actions/climb-in.js
// POST /climb-in

module.exports = function registerClimbIn(app, { engine, base }) {
  if (!app) throw new Error('climb-in: app is required');
  if (!engine || !engine.router) throw new Error('climb-in: engine.router is required');
  if (!base) throw new Error('climb-in: base is required');

  app.post(`${base}/climb-in`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });

      const result = await engine.router.handleClimbIn({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('climb-in error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'climb_in_failed') });
    }
  });
};