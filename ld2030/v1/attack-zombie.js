// ld2030/v1/attack-zombie.js
// Mounts POST /api/ld2030/v1/attack-zombie

module.exports = function registerAttackZombie(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/attack-zombie`, async (req, res) => {
    try {
      const {
        gameId = 'lockdown2030',
        attackerUid,
        zombieId,
        damage,
        apCost,
      } = req.body || {};

      if (!attackerUid || !zombieId) {
        return res.status(400).json({
          ok: false,
          error: 'missing_ids',
        });
      }

      const result = await engine.writer.attackZombie({
        gameId,
        attackerUid,
        zombieId,
        damage,
        apCost,
      });

      return res.json({
        ok: true,
        ...result,
      });
    } catch (e) {
      console.error('attack-zombie error', e);
      return res.status(500).json({
        ok: false,
        error: 'internal',
      });
    }
  });
};
