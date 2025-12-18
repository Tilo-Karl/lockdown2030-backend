// Mounts POST /api/ld2030/v1/barricade-stairs

module.exports = function registerBarricadeStairs(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/barricade-stairs`, async (req, res) => {
    try {
      const { uid, gameId = 'lockdown2030', dz } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await engine.router.handleBarricadeStairs({ uid, gameId, dz });
      return res.json(result);
    } catch (e) {
      console.error('barricade-stairs error', e);
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });
};