// ld2030/v1/actions/climb-out.js
// POST /climb-out
// Uses action-router helpers (not engine.processAction).

module.exports = function registerClimbOut(app, { actions, base } = {}) {
  if (!app) throw new Error('climb-out: app is required');
  if (!actions || typeof actions.handleClimbOut !== 'function') {
    throw new Error('climb-out: actions.handleClimbOut is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('climb-out: base is required');

  app.post(`${BASE}/climb-out`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleClimbOut({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('climb-out error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'climb_out_failed') });
    }
  });
};