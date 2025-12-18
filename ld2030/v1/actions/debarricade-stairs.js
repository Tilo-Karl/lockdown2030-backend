// Mounts POST /api/ld2030/v1/debarricade-stairs

module.exports = function registerDebarricadeStairs(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/debarricade-stairs`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030', dz } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await engine.router.handleDebarricadeStairs({ uid, gameId, dz });
      return res.json(result);
    } catch (e) {
      console.error('debarricade-stairs error', e);
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });
};