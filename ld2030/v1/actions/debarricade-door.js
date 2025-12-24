// ld2030/v1/actions/debarricade-door.js
// POST /debarricade-door
// Uses action-router helpers (not engine.processAction).

module.exports = function registerDebarricadeDoor(app, { actions, base } = {}) {
  if (!app) throw new Error('debarricade-door: app is required');
  if (!actions || typeof actions.handleDebarricadeDoor !== 'function') {
    throw new Error('debarricade-door: actions.handleDebarricadeDoor is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('debarricade-door: base is required');

  app.post(`${BASE}/debarricade-door`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleDebarricadeDoor({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('debarricade-door error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'debarricade_door_failed') });
    }
  });
};