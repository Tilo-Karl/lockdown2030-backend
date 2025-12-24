// ld2030/v1/engine/visibility.js
// Response boundary helpers (V1).
// These do NOT change gameplay truth; they only add derived maxes + labels.

const { integrityLabel } = require('./integrity');

function decorateDoor({ doorService, door }) {
  if (!doorService || !door) return door;
  const maxHp = doorService.computeDoorHp({ ...door, hp: 999999 });
  return { ...door, maxHp, integrity: integrityLabel({ hp: door.hp, maxHp }) };
}

function decorateStairs({ stairService, edge }) {
  if (!stairService || !edge) return edge;
  const maxHp = stairService.maxHpForLevel(edge.barricadeLevel);
  return { ...edge, maxHp, integrity: integrityLabel({ hp: edge.hp, maxHp }) };
}

module.exports = {
  decorateDoor,
  decorateStairs,
};