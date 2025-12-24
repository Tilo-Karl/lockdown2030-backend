// ld2030/v1/actions/ap-costs.js
// Single source of truth for AP costs (V1).
// Keep it dumb + tweak later with gameplay tests.

const AP = {
  // Core verbs
  MOVE_DEFAULT: 1,           // if you’re not using cell.moveCost yet
  ATTACK: 1,
  SEARCH: 1,
  ENTER_BUILDING: 1,
  STAIRS: 1,                 // floor change (dz ±1)
  CLIMB_IN: 1,
  CLIMB_OUT: 1,
  STAND_UP: 1,

  // Doors (edges/* kind=door)
  SECURE_DOOR: 1,
  BARRICADE_DOOR: 1,
  DEBARRICADE_DOOR: 1,
  REPAIR_DOOR: 2,

  // Stairs barricades (edges/* kind=stairs)
  BARRICADE_STAIRS: 1,
  DEBARRICADE_STAIRS: 1,

  // Generic repair (cells/* components etc)
  REPAIR_COMPONENT: 2,
};

function moveCostFromCell(cell) {
  // If your move handler is already using cell.moveCost, just ignore this.
  const v = Number(cell?.moveCost);
  return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : AP.MOVE_DEFAULT;
}

function apCostFor(tag, ctx = {}) {
  // ctx can include { cell } for MOVE if you want.
  switch (String(tag || '').toUpperCase()) {
    case 'MOVE':
    case 'MOVE_PLAYER':
      return moveCostFromCell(ctx.cell);

    case 'ATTACK':
    case 'ATTACK_ENTITY':
      return AP.ATTACK;

    case 'SEARCH':
      return AP.SEARCH;

    case 'ENTER_BUILDING':
      return AP.ENTER_BUILDING;

    case 'STAIRS':
      return AP.STAIRS;

    case 'CLIMB_IN':
      return AP.CLIMB_IN;

    case 'CLIMB_OUT':
      return AP.CLIMB_OUT;

    case 'STAND_UP':
      return AP.STAND_UP;

    case 'SECURE_DOOR':
      return AP.SECURE_DOOR;

    case 'BARRICADE_DOOR':
      return AP.BARRICADE_DOOR;

    case 'DEBARRICADE_DOOR':
      return AP.DEBARRICADE_DOOR;

    case 'REPAIR_DOOR':
      return AP.REPAIR_DOOR;

    case 'BARRICADE_STAIRS':
      return AP.BARRICADE_STAIRS;

    case 'DEBARRICADE_STAIRS':
      return AP.DEBARRICADE_STAIRS;

    case 'REPAIR_COMPONENT':
      return AP.REPAIR_COMPONENT;

    default:
      return AP.MOVE_DEFAULT;
  }
}

module.exports = {
  AP,
  apCostFor,
  moveCostFromCell,
};