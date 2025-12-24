// ld2030/v1/actions/stairs.js
// POST /stairs
// Uses action-router helpers (not engine.processAction).

module.exports = function registerStairs(app, { actions, base } = {}) {
  if (!app) throw new Error('stairs: app is required');
  if (!actions || typeof actions.handleStairs !== 'function') {
    throw new Error('stairs: actions.handleStairs is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('stairs: base is required');

  app.post(`${BASE}/stairs`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();
      const dz = body.dz;

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const step = Number(dz);
      if (!Number.isFinite(step) || (step !== 1 && step !== -1)) {
        return res.status(400).json({ ok: false, error: 'dz_must_be_plus_or_minus_1' });
      }

      const result = await actions.handleStairs({ uid, gameId, dz: step });
      return res.json(result);
    } catch (e) {
      console.error('stairs error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'stairs_failed') });
    }
  });
};