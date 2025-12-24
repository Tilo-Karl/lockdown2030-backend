// ld2030/v1/actions/equip-item.js
// POST /equip-item
// Uses action-router helpers (not engine.processAction).

module.exports = function registerEquipItem(app, { actions, base } = {}) {
  if (!app) throw new Error('equip-item: app is required');
  if (!actions || typeof actions.handleEquipItem !== 'function') {
    throw new Error('equip-item: actions.handleEquipItem is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('equip-item: base is required');

  app.post(`${BASE}/equip-item`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();
      const itemId = String(body.itemId || '').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
      if (!itemId) return res.status(400).json({ ok: false, error: 'itemId_required' });

      const result = await actions.handleEquipItem({ uid, gameId, itemId });
      return res.json(result);
    } catch (e) {
      console.error('equip-item error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'equip_failed') });
    }
  });
};