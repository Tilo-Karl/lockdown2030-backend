// ld2030/v1/engine/visibility.js
// Response boundary helpers (V1).
// These do NOT change gameplay truth; they only add derived maxes + labels.

const { integrityLabel } = require('./integrity');

function decorateDoor({ door }) {
  if (!door) return door;
  const structureMax = Number.isFinite(door.structureMaxHp) ? Number(door.structureMaxHp) : 0;
  const structureIntegrity = integrityLabel({ hp: door.structureHp ?? 0, maxHp: structureMax });
  const barricadeMax = Number.isFinite(door.barricadeMaxHp) ? Number(door.barricadeMaxHp) : 0;
  const barricadeIntegrity = integrityLabel({ hp: door.barricadeHp ?? 0, maxHp: barricadeMax });
  return {
    ...door,
    structureMaxHp: structureMax,
    barricadeMaxHp: barricadeMax,
    structureIntegrity,
    barricadeIntegrity,
  };
}

function decorateStairs({ edge }) {
  if (!edge) return edge;
  const barricadeMax = Number.isFinite(edge.barricadeMaxHp) ? Number(edge.barricadeMaxHp) : 0;
  const barricadeIntegrity = integrityLabel({ hp: edge.barricadeHp ?? 0, maxHp: barricadeMax });
  return { ...edge, barricadeMaxHp: barricadeMax, barricadeIntegrity };
}

module.exports = {
  decorateDoor,
  decorateStairs,
};
