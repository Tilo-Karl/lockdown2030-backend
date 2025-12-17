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
function canEnterTile({ actor, toChar }) {
  if (!actor) return { ok: false, reason: 'missing_actor' };
  if (!toChar) return { ok: false, reason: 'missing_tile' };

  if (isEncumbered(actor) && toChar === TILES.WATER) {
    return { ok: false, reason: 'encumbered_cannot_enter_water' };
  }

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

  return Math.max(0, base + enc + tilePenalty);
}

/**
 * planMove returns authoritative:
 * - to: {x,y,z}  (always includes z)
 * - isInsideBuilding: boolean (always set)
 *
 * Rules:
 * - Outside movement always stays outside (ENTER is explicit action)
 * - If inside, you may move only within the SAME building footprint at same z
 * - If inside and you step outside the footprint -> implicit EXIT: isInside=false, z=0
 *
 * Caller provides building footprint lookup:
 * - byXY: Map("x,y" -> buildingId)
 */
function planMove({ game, actor, dx, dy, byXY }) {
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

  const pos = actor?.pos || { x: 0, y: 0, z: 0 };
  const fromX = clampInt(pos.x ?? 0, 0, w - 1);
  const fromY = clampInt(pos.y ?? 0, 0, h - 1);
  const fromZ = Number.isFinite(pos.z) ? clampInt(pos.z, -9999, 9999) : 0;

  const toX = clampInt(fromX + dx, 0, w - 1);
  const toY = clampInt(fromY + dy, 0, h - 1);

  const toChar = getTileChar(terrain, toX, toY);
  const toMeta = getTileMeta(tileMeta, toChar);

  // ✅ FIX: call signature matches canEnterTile({ actor, toChar })
  const enter = canEnterTile({ actor, toChar });
  if (!enter.ok) return { ok: false, reason: enter.reason };

  const lookup = byXY instanceof Map ? byXY : new Map();

  const fromInside = actor.isInsideBuilding === true;

  const fromBuildingId = lookup.get(`${fromX},${fromY}`) || null;
  const toBuildingId = lookup.get(`${toX},${toY}`) || null;

  let nextInside = false;
  let nextZ = 0;

  if (fromInside) {
    // If state says "inside" but you're not on a footprint, force you out safely.
    if (!fromBuildingId) {
      nextInside = false;
      nextZ = 0;
    } else if (toBuildingId === fromBuildingId) {
      // Inside movement: same building only, keep z
      nextInside = true;
      nextZ = fromZ;
    } else {
      // Implicit EXIT (step out of footprint)
      nextInside = false;
      nextZ = 0;
    }
  } else {
    // Outside stays outside, even if you step onto a footprint (ENTER is explicit)
    nextInside = false;
    nextZ = 0;
  }

  const apCost = computeMoveApCost({ actor, toMeta });

  return {
    ok: true,
    from: { x: fromX, y: fromY, z: fromZ },
    to: { x: toX, y: toY, z: nextZ },
    isInsideBuilding: nextInside,
    apCost,
    toTile: { ch: toChar, meta: toMeta },
  };
}

module.exports = {
  planMove,
  canEnterTile,
  computeMoveApCost,
};