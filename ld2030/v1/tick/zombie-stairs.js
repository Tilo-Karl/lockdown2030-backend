// ld2030/v1/tick/zombie-stairs.js
// Zombie stairs helpers for tick.
// IMPORTANT (LOCKED):
// - Only barricade durability is stored (no separate structure).
// - barricadeLevel=0 or barricadeHp=0 => passable.
// - edgeId is Big Bang e_* (inside cell z <-> z+1, layer=1)

const { makeStairService } = require('../engine/stair-service');

const stairService = makeStairService();

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function endpointKey(p) {
  return `${p.x}_${p.y}_${p.z}_${p.layer}`;
}

function normEndpoint(p) {
  return {
    x: Number(p.x),
    y: Number(p.y),
    z: Number(p.z),
    layer: Number(p.layer),
  };
}

function edgeIdFor(a, b) {
  const A = normEndpoint(a);
  const B = normEndpoint(b);
  const ka = endpointKey(A);
  const kb = endpointKey(B);
  const left = (ka <= kb) ? A : B;
  const right = (ka <= kb) ? B : A;
  return `e_${endpointKey(left)}__${endpointKey(right)}`;
}

function insideEndpoint(x, y, z) {
  return { x, y, z, layer: 1 };
}

function stairsEdgeIdFor(x, y, zLo) {
  return edgeIdFor(insideEndpoint(x, y, zLo), insideEndpoint(x, y, zLo + 1));
}

function stairsEndpointsFor(x, y, zLo) {
  const zHi = zLo + 1;
  const a = insideEndpoint(x, y, zLo);
  const b = insideEndpoint(x, y, zHi);
  return {
    kind: 'stairs',
    a,
    b,
    x,
    y,
    zLo,
    zHi,
    fromCellId: `c_${x}_${y}_${zLo}_1`,
    toCellId: `c_${x}_${y}_${zHi}_1`,
  };
}

function mergeStairsEdge(x, y, zLo, raw) {
  return stairService.normalizeEdge({ x, y, zA: zLo, zB: zLo + 1 }, raw);
}

function isStairsBlockingZombie(e) {
  return stairService.isBlocked(e);
}

function stairsDamageFromCfg(cfg) {
  const dmg =
    Number.isFinite(cfg?.stairsDamage) ? Number(cfg.stairsDamage) :
    Number.isFinite(cfg?.attackDamage) ? Number(cfg.attackDamage) :
    2;
  return Math.max(0, Math.trunc(dmg));
}

module.exports = {
  stairsEdgeIdFor,
  stairsEndpointsFor,
  mergeStairsEdge,
  isStairsBlockingZombie,
  stairsDamageFromCfg,
};
