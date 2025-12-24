// ld2030/v1/actions/stand-up.js
// POST /stand-up
// Uses action-router helpers (not engine.processAction).

module.exports = function registerStandUp(app, { actions, base } = {}) {
  if (!app) throw new Error('stand-up: app is required');
  if (!actions || typeof actions.handleStandUp !== 'function') {
    throw new Error('stand-up: actions.handleStandUp is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('stand-up: base is required');

  app.post(`${BASE}/stand-up`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleStandUp({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('stand-up error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'stand_up_failed') });
    }
  });
};