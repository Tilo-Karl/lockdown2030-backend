// ld2030/v1/attack-entity.js
// Unified attack endpoint for ANY entity type.

module.exports = function registerAttackEntity(app, { engine, base }) {
  const BASE = base || '/api/ld2030/v1';

  app.post(`${BASE}/attack-entity`, async (req, res) => {
    try {
      const {
        uid,
        gameId = 'lockdown2030',
        targetId,
        damage,
        apCost,
      } = req.body || {};

      if (!uid || !targetId) {
        return res.status(400).json({
          ok: false,
          error: 'missing_uid_targetId',
        });
      }

      const result = await engine.router.handleAttackEntity({
        uid,
        gameId,
        targetId,
        damage,
        apCost,
      });

      // `result` is expected to be:
      // { ok: true, attacker: { id, hp, ap, ... }, target: { id, hp, dead?, damage? } }
      const attacker = result && result.attacker ? result.attacker : null;
      const target   = result && result.target ? result.target : null;

      const hpAfter =
        target && Number.isFinite(target.hp) ? target.hp : undefined;

      // Prefer explicit `dead` from writer; otherwise infer from hpAfter.
      const dead =
        target && typeof target.dead === 'boolean'
          ? target.dead
          : (typeof hpAfter === 'number' ? hpAfter <= 0 : undefined);

      const dmg =
        target && Number.isFinite(target.damage) ? target.damage : undefined;

      return res.json({
        ok: true,
        attackerUid: uid,
        targetId: target ? target.id : targetId,
        hit: true,          // for now, unified path always "hits" if it completes
        damage: dmg,
        hpAfter,
        dead,
        // Raw structs kept for future debugging / UI if needed; Codable will ignore extra keys.
        attacker,
        target,
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