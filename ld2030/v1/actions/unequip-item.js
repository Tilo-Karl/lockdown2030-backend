// ld2030/v1/actions/unequip-item.js
// POST /unequip-item
// Uses action-router helpers (not engine.processAction).

module.exports = function registerUnequipItem(app, { actions, base } = {}) {
  if (!app) throw new Error('unequip-item: app is required');
  if (!actions || typeof actions.handleUnequipItem !== 'function') {
    throw new Error('unequip-item: actions.handleUnequipItem is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('unequip-item: base is required');

  app.post(`${BASE}/unequip-item`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();
      const itemId = String(body.itemId || '').trim();

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
      if (!itemId) return res.status(400).json({ ok: false, error: 'itemId_required' });

      const result = await actions.handleUnequipItem({ uid, gameId, itemId });
      return res.json(result);
    } catch (e) {
      console.error('unequip-item error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'unequip_failed') });
    }
  });
};