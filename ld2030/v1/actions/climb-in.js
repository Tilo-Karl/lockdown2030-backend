// ld2030/v1/actions/climb-in.js
// POST /climb-in
// Uses action-router helpers (not engine.processAction).

module.exports = function registerClimbIn(app, { actions, base } = {}) {
  if (!app) throw new Error('climb-in: app is required');
  if (!actions || typeof actions.handleClimbIn !== 'function') {
    throw new Error('climb-in: actions.handleClimbIn is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('climb-in: base is required');

  app.post(`${BASE}/climb-in`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleClimbIn({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('climb-in error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'climb_in_failed') });
    }
  });
};