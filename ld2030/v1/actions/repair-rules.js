// ld2030/v1/actions/repair-rules.js
// Central repair rules (V1).

const { WORLD } = require('../config/config-game');
const { apCostFor } = require('./ap-costs');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function searchMaxForBuildingType(type) {
  const search = WORLD?.CELLS?.INSIDE?.SEARCH || {};
  if (typeof search.maxRemainingForBuildingType === 'function') {
    const v = search.maxRemainingForBuildingType(type);
    return Number.isFinite(v) ? Number(v) : 3;
  }
  const d = search.MAX_REMAINING_DEFAULT;
  return Number.isFinite(d) ? Number(d) : 3;
}

function derivedInsideMaxes(type) {
  const inside = WORLD?.CELLS?.INSIDE || {};

  const maxHp = (typeof inside.maxHpForBuildingType === 'function')
    ? inside.maxHpForBuildingType(type)
    : (inside.HP_MAX_DEFAULT ?? 50);

  const comp = inside.COMPONENT_MAX || {};
  return {
    maxHp: Number.isFinite(maxHp) ? Number(maxHp) : 50,
    fuseMax: Number.isFinite(comp.fuseHp) ? Number(comp.fuseHp) : 10,
    waterMax: Number.isFinite(comp.waterHp) ? Number(comp.waterHp) : 10,
    generatorMax: Number.isFinite(comp.generatorHp) ? Number(comp.generatorHp) : 0,
    searchMax: searchMaxForBuildingType(type),
  };
}

function buildingTypeFromCell(cell) {
  if (!cell) return null;
  if (cell.type != null) return String(cell.type);
  if (cell.building && typeof cell.building === 'object' && cell.building.type != null) {
    return String(cell.building.type);
  }
  return null;
}

const REPAIR = {
  INSIDE_HP_DELTA: 12,
  FUSE_HP_DELTA: 4,
  WATER_HP_DELTA: 4,
  GENERATOR_HP_DELTA: 3,
};

function canRepairDoor(edge) {
  if (!edge || edge.kind !== 'door') return false;
  const destroyed = edge.isDestroyed === true || (Number.isFinite(edge.structureHp) && Number(edge.structureHp) <= 0);
  return destroyed;
}

function canRepairInsideCellStructure(cell) {
  if (!cell) return false;
  if (nInt(cell.layer, -1) !== 1) return false;

  const type = buildingTypeFromCell(cell);
  const mx = derivedInsideMaxes(type);
  const cur = nInt(cell.hp, 0);
  return cur < mx.maxHp;
}

function canRepairComponent(cell, key) {
  if (!cell) return false;
  if (nInt(cell.layer, -1) !== 1) return false;

  const type = buildingTypeFromCell(cell);
  const mx = derivedInsideMaxes(type);

  if (key === 'fuse') {
    const cur = nInt(cell?.fuse?.hp, 0);
    return mx.fuseMax > 0 && cur < mx.fuseMax;
  }
  if (key === 'water') {
    const cur = nInt(cell?.water?.hp, 0);
    return mx.waterMax > 0 && cur < mx.waterMax;
  }
  if (key === 'generator') {
    const cur = nInt(cell?.generator?.hp, 0);
    return mx.generatorMax > 0 && cur < mx.generatorMax;
  }
  return false;
}

function patchRepairInsideStructure(cell) {
  const type = buildingTypeFromCell(cell);
  const mx = derivedInsideMaxes(type);

  const cur = nInt(cell.hp, 0);
  const next = clamp(cur + REPAIR.INSIDE_HP_DELTA, 0, mx.maxHp);

  // IMPORTANT:
  // - Repairing structure MUST be able to "un-ruin" a room (ruined blocks utilities).
  // - Components do NOT touch ruined, but structure repair does.
  const patch = { hp: next };

  if (next > 0 && cell?.ruined === true) patch.ruined = false;

  return patch;
}

function patchRepairFuse(cell) {
  const type = buildingTypeFromCell(cell);
  const mx = derivedInsideMaxes(type);

  const cur = nInt(cell?.fuse?.hp, 0);
  const next = clamp(cur + REPAIR.FUSE_HP_DELTA, 0, mx.fuseMax);

  return { fuse: { ...(isObj(cell.fuse) ? cell.fuse : {}), hp: next } };
}

function patchRepairWater(cell) {
  const type = buildingTypeFromCell(cell);
  const mx = derivedInsideMaxes(type);

  const cur = nInt(cell?.water?.hp, 0);
  const next = clamp(cur + REPAIR.WATER_HP_DELTA, 0, mx.waterMax);

  return { water: { ...(isObj(cell.water) ? cell.water : {}), hp: next } };
}

function patchRepairGenerator(cell) {
  const type = buildingTypeFromCell(cell);
  const mx = derivedInsideMaxes(type);

  const cur = nInt(cell?.generator?.hp, 0);
  const next = clamp(cur + REPAIR.GENERATOR_HP_DELTA, 0, mx.generatorMax);

  const installed = cell?.generator?.installed === true;
  return { generator: { ...(isObj(cell.generator) ? cell.generator : {}), installed, hp: next } };
}

function resolveCellRepairTarget(cell, preferred = null) {
  const pref = preferred ? String(preferred).toLowerCase() : null;

  const options = {
    fuse: canRepairComponent(cell, 'fuse'),
    water: canRepairComponent(cell, 'water'),
    generator: canRepairComponent(cell, 'generator'),
    structure: canRepairInsideCellStructure(cell),
  };

  if (pref && options[pref] === true) return pref;

  if (options.fuse) return 'fuse';
  if (options.water) return 'water';
  if (options.generator) return 'generator';
  if (options.structure) return 'structure';

  return null;
}

function apCostForRepair(target) {
  if (target === 'door') return apCostFor('REPAIR_DOOR');
  return apCostFor('REPAIR_COMPONENT');
}

module.exports = {
  REPAIR,
  derivedInsideMaxes,
  buildingTypeFromCell,

  canRepairDoor,
  canRepairInsideCellStructure,
  canRepairComponent,

  resolveCellRepairTarget,
  apCostForRepair,

  patchRepairInsideStructure,
  patchRepairFuse,
  patchRepairWater,
  patchRepairGenerator,
};
