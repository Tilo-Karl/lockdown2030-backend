// ld2030/v1/actions/secure-door.js
// POST /secure-door
// Uses action-router helpers (not engine.processAction).

module.exports = function registerSecureDoor(app, { actions, base } = {}) {
  if (!app) throw new Error('secure-door: app is required');
  if (!actions || typeof actions.handleSecureDoor !== 'function') {
    throw new Error('secure-door: actions.handleSecureDoor is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('secure-door: base is required');

  app.post(`${BASE}/secure-door`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleSecureDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('secure-door error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'secure_door_failed') });
    }
  });
};