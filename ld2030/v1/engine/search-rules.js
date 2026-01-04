// ld2030/v1/engine/search-rules.js
// Pure validation + “what spot am I searching?”
//
// MASTER PLAN (LOCKED):
// - actor.pos is ALWAYS { x, y, z, layer } where layer ∈ {0,1}
// - NO legacy fields / NO fallbacks (NO isInsideBuilding)

const { ensureSearch } = require('../world/cells');

const LOOT_CHANCE = 0.3;

function nIntStrict(x, tag) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(tag);
  return Math.trunc(v);
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

function buildingTypeForCell(cell) {
  if (!cell || typeof cell !== 'object') return null;
  if (cell.type != null) return String(cell.type);
  if (cell.building && typeof cell.building === 'object' && cell.building.type != null) {
    return String(cell.building.type);
  }
  return null;
}

function planSearch({ actor, cell, rng = Math.random }) {
  const TAG = 'SEARCH_RULES';

  const pos = requirePos(actor, TAG);

  // Must be inside to search (layer=1 is the truth)
  if (pos.layer !== 1) {
    return { ok: false, reason: 'must_be_inside_building' };
  }

  if (!cell || typeof cell !== 'object') {
    return { ok: false, reason: 'cell_missing' };
  }

  const cx = nIntStrict(cell.x, `${TAG}: cell_x_invalid`);
  const cy = nIntStrict(cell.y, `${TAG}: cell_y_invalid`);
  const cz = nIntStrict(cell.z, `${TAG}: cell_z_invalid`);
  const cl = nIntStrict(cell.layer, `${TAG}: cell_layer_invalid`);

  if (cx !== pos.x || cy !== pos.y || cz !== pos.z || cl !== pos.layer) {
    return { ok: false, reason: 'cell_mismatch' };
  }

  const searchState = ensureSearch(cell);
  const canLoot = Number.isFinite(searchState.remaining) && searchState.remaining > 0;
  const rollFn = typeof rng === 'function' ? rng : Math.random;
  const roll = rollFn();
  const lootRollsPositive = Number.isFinite(roll) && roll >= 0 && roll < LOOT_CHANCE;

  return {
    ok: true,
    apCost: 1,
    pos,
    spotId: `i_${pos.x}_${pos.y}_${pos.z}_${pos.layer}`,
    canLoot,
    willAttemptLoot: canLoot && lootRollsPositive,
    buildingType: buildingTypeForCell(cell),
    searchState,
  };
}

module.exports = { planSearch };
