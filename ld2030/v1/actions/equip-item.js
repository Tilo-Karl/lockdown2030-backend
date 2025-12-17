// ld2030/v1/actions/equip-item.js
// HTTP -> router action. No game logic here.

module.exports = function registerEquipItem(app, { engine, base }) {
  if (!app) throw new Error('registerEquipItem: app is required');
  if (!engine?.router) throw new Error('registerEquipItem: engine.router is required');
  if (!base) throw new Error('registerEquipItem: base is required');

  app.post(`${base}/equip-item`, async (req, res) => {
    try {
      const { uid, itemId, gameId = 'lockdown2030' } = req.body || {};
      if (!uid) return res.status(400).json({ ok: false, error: 'missing_uid' });
      if (!itemId) return res.status(400).json({ ok: false, error: 'missing_itemId' });

      // action-router must expose: handleEquipItem({ uid, itemId, gameId })
      const result = await engine.router.handleEquipItem({ uid, itemId, gameId });
      return res.json(result);
    } catch (e) {
      console.error('equip-item error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || e) });
    }
  });
};