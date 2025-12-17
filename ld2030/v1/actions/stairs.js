// ld2030/v1/actions/stairs.js
// POST /stairs
// Explicit action: change z by dz (+1 / -1) while staying inside the same building footprint.
// Validation + AP spend happens inside engine/router.

module.exports = function registerStairs(app, { engine, base }) {
  if (!app) throw new Error('stairs: app is required');
  if (!engine || !engine.router) throw new Error('stairs: engine.router is required');
  if (!base) throw new Error('stairs: base is required');

  app.post(`${base}/stairs`, async (req, res) => {
    try {
      const { uid, dz, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });

      const step = Number(dz);
      if (!Number.isFinite(step) || (step !== 1 && step !== -1)) {
        return res.status(400).json({ ok: false, error: 'dz_must_be_plus_or_minus_1' });
      }

      const result = await engine.router.handleStairs({ uid, gameId, dz: step });
      return res.json(result);
    } catch (e) {
      console.error('stairs error', e);
      return res.status(400).json({ ok: false, error: String(e.message || 'stairs_failed') });
    }
  });
};