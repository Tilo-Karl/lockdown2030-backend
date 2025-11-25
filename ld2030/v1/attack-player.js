// ld2030/v1/attack-player.js
// Mounts POST /api/ld2030/v1/attack-player

module.exports = function registerAttackPlayer(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/attack-player`, async (req, res) => {
    try {
      const { uid, targetUid, gameId = 'lockdown2030' } = req.body || {};
      if (!uid || !targetUid) {
        return res.status(400).json({ ok: false, error: 'uid_and_targetUid_required' });
      }
      if (uid === targetUid) {
        return res.status(400).json({ ok: false, error: 'cannot_attack_self' });
      }

      const result = await engine.router.handleAttack({ uid, targetUid, gameId });
      return res.json(result);

    } catch (e) {
      console.error('attack-player error', e);
      return res.status(500).json({ ok: false, error: 'server_error' });
    }
  });
};