// ld2030/v1/actions/barricade-stairs.js
// POST /barricade-stairs
// Uses action-router helpers (not engine.processAction).

module.exports = function registerBarricadeStairs(app, { actions, base } = {}) {
  if (!app) throw new Error('barricade-stairs: app is required');
  if (!actions || typeof actions.handleBarricadeStairs !== 'function') {
    throw new Error('barricade-stairs: actions.handleBarricadeStairs is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('barricade-stairs: base is required');

  app.post(`${BASE}/barricade-stairs`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();
      const step = Number(body.dz);

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
      if (!Number.isFinite(step) || (step !== 1 && step !== -1)) {
        return res.status(400).json({ ok: false, error: 'dz_must_be_plus_or_minus_1' });
      }

      const result = await actions.handleBarricadeStairs({ uid, gameId, dz: step });
      return res.json(result);
    } catch (e) {
      console.error('barricade-stairs error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'barricade_stairs_failed') });
    }
  });
};