// ld2030/v1/actions/debarricade-stairs.js
// POST /debarricade-stairs
// Uses action-router helpers (not engine.processAction).

module.exports = function registerDebarricadeStairs(app, { actions, base } = {}) {
  if (!app) throw new Error('debarricade-stairs: app is required');
  if (!actions || typeof actions.handleDebarricadeStairs !== 'function') {
    throw new Error('debarricade-stairs: actions.handleDebarricadeStairs is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('debarricade-stairs: base is required');

  app.post(`${BASE}/debarricade-stairs`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();
      const step = Number(body.dz);

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
      if (!Number.isFinite(step) || (step !== 1 && step !== -1)) {
        return res.status(400).json({ ok: false, error: 'dz_must_be_plus_or_minus_1' });
      }

      const result = await actions.handleDebarricadeStairs({ uid, gameId, dz: step });
      return res.json(result);
    } catch (e) {
      console.error('debarricade-stairs error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'debarricade_stairs_failed') });
    }
  });
};