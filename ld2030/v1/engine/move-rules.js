// ld2030/v1/engine/move-rules.js
// Pure movement rules (no Firestore).
//
// MASTER PLAN (LOCKED):
// - Runtime truth comes from cells/* (caller provides targetCell)
// - actor.pos is ALWAYS { x, y, z, layer } where layer ∈ {0,1}
// - NO legacy fields / NO fallbacks

function nIntStrict(x, tag) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(tag);
  return Math.trunc(v);
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function requirePos(actor, tag) {
  const p = actor?.pos;
  if (!p || typeof p !== 'object') throw new Error(`${tag}: missing_pos`);

  const x = nIntStrict(p.x, `${tag}: pos_x_invalid`);
  const y = nIntStrict(p.y, `${tag}: pos_y_invalid`);
  const z = nIntStrict(p.z, `${tag}: pos_z_invalid`);
  const layer = nIntStrict(p.layer, `${tag}: pos_layer_missing`);

  if (layer !== 0 && layer !== 1) throw new Error(`${tag}: pos_layer_invalid`);
  return { x, y, z, layer };
}

function validateStep(dx, dy, tag) {
  const sx = nIntStrict(dx, `${tag}: dx_invalid`);
  const sy = nIntStrict(dy, `${tag}: dy_invalid`);
  if (sx === 0 && sy === 0) throw new Error(`${tag}: zero_step`);
  if (Math.abs(sx) > 1 || Math.abs(sy) > 1) throw new Error(`${tag}: invalid_step`);
  return { sx, sy };
}

/**
 * planMove:
 * - Movement stays on SAME z/layer plane (engine owns ENTER/STAIRS/CLIMB semantics)
 * - Caller passes grid {w,h} + targetCell (runtime truth from cells/*)
 */
function planMove({ game, actor, dx, dy, targetCell }) {
  const TAG = 'MOVE_RULES';
  if (!game) throw new Error(`${TAG}: missing_game`);
  if (!actor) throw new Error(`${TAG}: missing_actor`);

  const pos = requirePos(actor, TAG);
  const { sx, sy } = validateStep(dx, dy, TAG);

  const gs = game.gridsize || {};
  const W = Number.isFinite(gs.w ?? game.w) ? nIntStrict(gs.w ?? game.w, `${TAG}: grid_w_invalid`) : 0;
  const H = Number.isFinite(gs.h ?? game.h) ? nIntStrict(gs.h ?? game.h, `${TAG}: grid_h_invalid`) : 0;
  if (W <= 0 || H <= 0) throw new Error(`${TAG}: invalid_grid`);

  const nextX = clamp(pos.x + sx, 0, W - 1);
  const nextY = clamp(pos.y + sy, 0, H - 1);

  // Runtime truth must be provided by caller (cells/*)
  if (!targetCell) return { ok: false, reason: 'target_cell_missing' };
  if (targetCell.blocksMove === true) return { ok: false, reason: 'blocked' };

  const apCost = Number.isFinite(targetCell.moveCost) ? Math.trunc(targetCell.moveCost) : 1;

  const nextPos = { x: nextX, y: nextY, z: pos.z, layer: pos.layer };

  return { ok: true, pos: nextPos, apCost };
}

module.exports = { planMove };
