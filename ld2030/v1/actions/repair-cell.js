// ld2030/v1/actions/repair-cell.js
// POST /repair-cell
// Uses action-router helpers (not engine.processAction).
//
// Body:
// - uid (required)
// - gameId (optional, default lockdown2030)
// - preferred (optional: "fuse" | "water" | "generator" | "structure" | "auto")

module.exports = function registerRepairCell(app, { actions, base } = {}) {
  if (!app) throw new Error('repair-cell: app is required');
  if (!actions || typeof actions.handleRepairCell !== 'function') {
    throw new Error('repair-cell: actions.handleRepairCell is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('repair-cell: base is required');

  app.post(`${BASE}/repair-cell`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();
      const preferred = body.preferred != null ? String(body.preferred).trim() : null;

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });

      const result = await actions.handleRepairCell({ uid, gameId, preferred });
      return res.json(result);
    } catch (e) {
      console.error('repair-cell error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'repair_cell_failed') });
    }
  });
};