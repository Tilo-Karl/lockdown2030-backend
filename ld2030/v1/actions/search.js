// ld2030/v1/actions/search.js
// HTTP -> router action. No game logic here.

module.exports = function registerSearch(app, { engine, base }) {
  if (!app) throw new Error('registerSearch: app is required');
  if (!engine?.router) throw new Error('registerSearch: engine.router is required');
  if (!base) throw new Error('registerSearch: base is required');

  app.post(`${base}/search`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });

      // IMPORTANT: this must exist in action-router.js:
      // router.handleSearch({ uid, gameId })
      const result = await engine.router.handleSearch({ uid, gameId });
      return res.json(result);
    } catch (e) {
      console.error('search error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || e) });
    }
  });
};