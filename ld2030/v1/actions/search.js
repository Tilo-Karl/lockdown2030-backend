// ld2030/v1/actions/search.js
// POST /search
// Uses action-router helpers (not engine.processAction).

module.exports = function registerSearch(app, { actions, base } = {}) {
  if (!app) throw new Error('search: app is required');
  if (!actions || typeof actions.handleSearch !== 'function') {
    throw new Error('search: actions.handleSearch is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('search: base is required');

  app.post(`${BASE}/search`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleSearch({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('search error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'search_failed') });
    }
  });
};