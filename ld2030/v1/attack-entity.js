// ld2030/v1/attack-entity.js
// Unified attack endpoint for ANY entity type.

module.exports = function registerAttackEntity(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/attack-entity`, async (req, res) => {
    try {
      const {
        uid,
        gameId = 'lockdown2030',
        targetType,
        targetId,
        damage,
        apCost,
      } = req.body || {};

      if (!uid || !targetType || !targetId) {
        return res.status(400).json({
          ok: false,
          error: 'missing_uid_targetType_targetId',
        });
      }

      const result = await engine.router.handleAttackEntity({
        uid,
        gameId,
        targetType,
        targetId,
        damage,
        apCost,
      });

      return res.json({
        ok: true,
        ...result,
      });
    } catch (e) {
      console.error('attack-entity error', e);

      const msg = e && e.message ? String(e.message) : 'internal';
      let reason = 'internal';

      if (msg.includes('not_enough_ap')) {
        reason = 'not_enough_ap';
      } else if (msg.includes('entity_not_found')) {
        reason = 'entity_not_found';
      }

      // Logical game error as HTTP 200 so client can inspect `reason`.
      return res.json({
        ok: false,
        reason,
        error: msg,
      });
    }
  });
};