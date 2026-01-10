// ld2030/v1/actions/move.js
// POST /move
// Canonical MOVE endpoint (explicit 4D targets).

function normalizeTarget(body) {
  const raw = (body && typeof body.to === 'object') ? body.to : null;
  if (!raw) {
    throw new Error('to_required');
  }

  const nx = Number(raw.x);
  const ny = Number(raw.y);
  const nz = Number(raw.z);
  const nl = Number(raw.layer);

  if (!Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz) || !Number.isFinite(nl)) {
    throw new Error('to_invalid');
  }

  const layer = Math.trunc(nl);
  if (layer !== 0 && layer !== 1) {
    throw new Error('to_layer_invalid');
  }

  return {
    x: Math.trunc(nx),
    y: Math.trunc(ny),
    z: Math.trunc(nz),
    layer,
  };
}

module.exports = function registerMove(app, { actions, base } = {}) {
  if (!app) throw new Error('move: app is required');
  if (!actions || typeof actions.handleMove !== 'function') {
    throw new Error('move: actions.handleMove is required');
  }

  const BASE = String(base || '').trim();
  if (!BASE) throw new Error('move: base is required');

  app.post(`${BASE}/move`, async (req, res) => {
    try {
      const body = req.body || {};
      const entityId = String(body.entityId || '').trim();
      const gameId = String(body.gameId || 'lockdown2030').trim();

      if (!entityId) return res.status(400).json({ ok: false, error: 'entityId_required' });
      const uid = entityId;

      let target;
      try {
        target = normalizeTarget(body);
      } catch (err) {
        return res.status(400).json({ ok: false, error: err?.message || 'to_invalid' });
      }

      const result = await actions.handleMove({ uid, gameId, to: target });
      return res.json(result);
    } catch (e) {
      console.error('move error', e);
      return res.status(400).json({ ok: false, error: String(e?.message || 'move_failed') });
    }
  });
};
