// ld2030/v1/actions/attack-entity.js
// POST /attack-entity
// Unified attack action. Route does NOT rewrite engine result.
// Uses action-router helpers (not engine.processAction).

module.exports = function registerAttackEntity(app, { actions, base } = {}) {
  if (!app) throw new Error('attack-entity: app is required');
  if (!actions || typeof actions.handleAttackEntity !== 'function') {
    throw new Error('attack-entity: actions.handleAttackEntity is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('attack-entity: base is required');

  app.post(`${BASE}/attack-entity`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();
      const targetId = String(body.targetId || '').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
      if (!targetId) return res.status(400).json({ ok: false, error: 'targetId_required' });

      const result = await actions.handleAttackEntity({ uid, gameId, targetId });
      return res.json(result);
    } catch (e) {
      console.error('attack-entity error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'attack_failed') });
    }
  });
};