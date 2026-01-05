// ld2030/v1/tick/zombie-doors.js
// Zombie door helpers for tick.
// IMPORTANT (LOCKED):
// - isDestroyed is truth for “gone/open”
// - NO isBroken anywhere
// - passable iff isOpen===true OR destroyed (structureHp<=0)

const { DOOR } = require('../config/config-doors');
const { makeDoorService } = require('../engine/door-service');

const doorService = makeDoorService();

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

function outsideEndpoint(x, y) {
  return { x, y, z: 0, layer: 0 };
}

function insideEndpoint(x, y) {
  return { x, y, z: 0, layer: 1 };
}

function doorEdgeIdForTile(x, y) {
  return edgeIdFor(outsideEndpoint(x, y), insideEndpoint(x, y));
}

function doorEndpointsForTile(x, y) {
  const a = outsideEndpoint(x, y);
  const b = insideEndpoint(x, y);
  return {
    kind: 'door',
    a,
    b,
    x,
    y,
    outsideCellId: `c_${x}_${y}_0_0`,
    insideCellId: `c_${x}_${y}_0_1`,
  };
}

function mergeDoorEdge(x, y, raw) {
  return doorService.normalizeDoor(x, y, raw);
}

function isDoorBlockingZombie(d) {
  return !doorService.isDoorPassable(d);
}

function doorDamageFromCfg(cfg) {
  const dmg =
    Number.isFinite(cfg?.doorDamage) ? Number(cfg.doorDamage) :
    Number.isFinite(cfg?.attackDamage) ? Number(cfg.attackDamage) :
    2;
  return Math.max(0, Math.trunc(dmg));
}

module.exports = {
  doorEdgeIdForTile,
  doorEndpointsForTile,
  mergeDoorEdge,
  isDoorBlockingZombie,
  doorDamageFromCfg,
};
