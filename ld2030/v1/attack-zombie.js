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

      const result = await engine.router.handleAttackZombie({
        uid: attackerUid,
        zombieId,
        gameId,
        damage,
        apCost,
      });

      return res.json({
        ok: true,
        ...result,
      });
    } catch (e) {
      console.error('attack-zombie error', e);

      const msg = e && e.message ? String(e.message) : 'internal';
      let reason = 'internal';

      if (msg.includes('not_enough_ap')) {
        reason = 'not_enough_ap';
      } else if (msg.includes('attacker_not_found')) {
        reason = 'attacker_not_found';
      } else if (msg.includes('zombie_not_found')) {
        reason = 'zombie_not_found';
      }

      // Return a logical game error (HTTP 200) so the client can read `reason`.
      return res.json({
        ok: false,
        reason,
        error: msg,
      });
    }
  });
};
