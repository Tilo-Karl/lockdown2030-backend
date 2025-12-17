// ld2030/v1/actions/unequip-item.js
// HTTP -> router action. No game logic here.

module.exports = function registerUnequipItem(app, { engine, base }) {
  if (!app) throw new Error('registerUnequipItem: app is required');
  if (!engine?.router) throw new Error('registerUnequipItem: engine.router is required');
  if (!base) throw new Error('registerUnequipItem: base is required');

  app.post(`${base}/unequip-item`, async (req, res) => {
    try {
      const { uid, itemId, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });
      if (!itemId) return res.status(400).json({ ok: false, error: 'missing_itemId' });

      // action-router must expose: handleUnequipItem({ uid, itemId, gameId })
      const result = await engine.router.handleUnequipItem({ uid, itemId, gameId });
      return res.json(result);
    } catch (e) {
      console.error('unequip-item error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || e) });
    }
  });
};