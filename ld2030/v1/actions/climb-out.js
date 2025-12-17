// ld2030/v1/actions/climb-out.js
// POST /climb-out

module.exports = function registerClimbOut(app, { engine, base }) {
  if (!app) throw new Error('climb-out: app is required');
  if (!engine || !engine.router) throw new Error('climb-out: engine.router is required');
  if (!base) throw new Error('climb-out: base is required');

  app.post(`${base}/climb-out`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });

      const result = await engine.router.handleClimbOut({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('climb-out error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'climb_out_failed') });
    }
  });
};