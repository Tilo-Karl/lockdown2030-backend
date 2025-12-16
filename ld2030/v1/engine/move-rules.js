// ld2030/v1/engine/move-rules.js
// Pure movement rules (no Firestore).
// Centralizes ALL "can enter tile" + AP cost logic so every caller is consistent.

const { TILES } = require('../config');
const { isEncumbered } = require('./encumbrance');

function clampInt(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(Math.max(Math.trunc(x), min), max);
}

function validateStep(dx, dy) {
  const x = Number(dx);
  const y = Number(dy);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, reason: 'invalid_delta' };

  const ax = Math.abs(x);
  const ay = Math.abs(y);

  // 4-dir only, 1 tile only
  if ((ax + ay) !== 1) return { ok: false, reason: 'invalid_step' };

  return { ok: true };
}

function getTileChar(terrain, x, y) {
  if (!Array.isArray(terrain) || terrain.length === 0) throw new Error('missing_terrain');
  const row = terrain[y];
  if (typeof row !== 'string') throw new Error('invalid_terrain_row');
  return row.charAt(x);
}

function getTileMeta(tileMeta, ch) {
  if (!tileMeta || typeof tileMeta !== 'object') return null;
  return tileMeta[ch] || null;
}

/**
 * Rule: encumbered actors cannot enter WATER.
 * (Water is otherwise allowed right now.)
 */
function canEnterTile({ actor, toChar, toMeta }) {
  if (!actor) return { ok: false, reason: 'missing_actor' };
  if (!toChar) return { ok: false, reason: 'missing_tile' };

  if (isEncumbered(actor) && toChar === TILES.WATER) {
    return { ok: false, reason: 'encumbered_cannot_enter_water' };
  }

  // Nothing else blocks movement yet.
  // (Do NOT enforce toMeta.blocksMovement today—water is “swimmable”.)
  return { ok: true };
}

/**
 * AP cost model (current):
 * - start from actor.moveApCost (includes equipment penalties already)
 * - +1 if encumbered
 * - + (tileMoveCost - 1) if tile meta has moveCost (default 1)
 */
function computeMoveApCost({ actor, toMeta }) {
  if (!actor) throw new Error('missing_actor');

  const base = Number.isFinite(actor.moveApCost) ? actor.moveApCost : 1;
  const enc = isEncumbered(actor) ? 1 : 0;

  const tileMove = Number.isFinite(toMeta?.moveCost) ? toMeta.moveCost : 1;
  const tilePenalty = Math.max(0, tileMove - 1);

  const cost = Math.max(0, base + enc + tilePenalty);
  return cost;
}

/**
 * Convenience: given game + actor + deltas, produce the move plan or a reason.
 * Engine should call this before writing.
 */
function planMove({ game, actor, dx, dy }) {
  if (!game) throw new Error('missing_game');
  if (!actor) throw new Error('missing_actor');

  const stepCheck = validateStep(dx, dy);
  if (!stepCheck.ok) return { ok: false, reason: stepCheck.reason };

  const gridSize = game?.gridsize || { w: 32, h: 32 };
  const w = clampInt(gridSize.w ?? 32, 1, 9999);
  const h = clampInt(gridSize.h ?? 32, 1, 9999);

  const mapMeta = game?.mapMeta;
  const terrain = mapMeta?.terrain;
  if (!Array.isArray(terrain) || terrain.length === 0) return { ok: false, reason: 'missing_map_terrain' };

  const tileMeta = mapMeta?.tileMeta || {};

  const pos = actor?.pos || { x: 0, y: 0 };
  const fromX = clampInt(pos.x ?? 0, 0, w - 1);
  const fromY = clampInt(pos.y ?? 0, 0, h - 1);

  const toX = clampInt(fromX + dx, 0, w - 1);
  const toY = clampInt(fromY + dy, 0, h - 1);

  // No-op move still counts as invalid step earlier, so we’re safe.

  const toChar = getTileChar(terrain, toX, toY);
  const toMeta = getTileMeta(tileMeta, toChar);

  const enter = canEnterTile({ actor, toChar, toMeta });
  if (!enter.ok) return { ok: false, reason: enter.reason };

  const apCost = computeMoveApCost({ actor, toMeta });

  return {
    ok: true,
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    apCost,
    toTile: { ch: toChar, meta: toMeta },
  };
}

module.exports = {
  planMove,
  canEnterTile,
  computeMoveApCost,
};