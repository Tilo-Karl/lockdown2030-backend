// ld2030/v1/actions/move-player.js
// POST /move-player
// Uses action-router helpers (not engine.processAction).

module.exports = function registerMovePlayer(app, { actions, base } = {}) {
  if (!app) throw new Error('move-player: app is required');
  if (!actions || typeof actions.handleMove !== 'function') {
    throw new Error('move-player: actions.handleMove is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('move-player: base is required');

  app.post(`${BASE}/move-player`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = String(body.uid || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      const dx = Number(body.dx);
      const dy = Number(body.dy);

      if (!uid) return res.status(400).json({ ok: false, error: 'uid_required' });
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
        return res.status(400).json({ ok: false, error: 'dx_dy_required' });
      }

      const result = await actions.handleMove({ uid, gameId, dx, dy });
      return res.json(result);
    } catch (e) {
      console.error('move-player error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'move_failed') });
    }
  });
};