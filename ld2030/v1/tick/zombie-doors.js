// ld2030/v1/tick/zombie-doors.js
// Zombie door helpers for tick.
// IMPORTANT (LOCKED):
// - isDestroyed is truth for “gone/open”
// - NO isBroken anywhere
// - passable iff isOpen===true OR destroyed (hp<=0)

const { DOOR } = require('../config/config-doors');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
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

function computeDoorHp(d) {
  const maxLvl = nInt(DOOR.MAX_BARRICADE_LEVEL, 5);
  const lvl = clamp(nInt(d?.barricadeLevel, 0), 0, maxLvl);
  const base = nInt(DOOR.BASE_HP, 10);
  const secure = d?.isSecured === true ? nInt(DOOR.SECURE_HP_BONUS, 5) : 0;
  const per = nInt(DOOR.HP_PER_LEVEL, 10);
  return Math.max(0, base + secure + (lvl * per));
}

function isDestroyedDoor(d) {
  const hp = Number.isFinite(d?.hp) ? Number(d.hp) : null;
  return d?.isDestroyed === true || (hp != null && hp <= 0);
}

function mergeDoorEdge(x, y, raw) {
  const base = {
    edgeId: doorEdgeIdForTile(x, y),
    kind: 'door',
    x,
    y,

    a: outsideEndpoint(x, y),
    b: insideEndpoint(x, y),

    isOpen: false,
    isSecured: false,
    barricadeLevel: 0,

    isDestroyed: false,

    hp: null,
  };

  const d = (raw && typeof raw === 'object') ? { ...base, ...raw } : { ...base };

  d.kind = 'door';

  d.a = normEndpoint((d.a && typeof d.a === 'object') ? d.a : base.a);
  d.b = normEndpoint((d.b && typeof d.b === 'object') ? d.b : base.b);
  d.edgeId = edgeIdFor(d.a, d.b);

  d.x = nInt(d.x, x);
  d.y = nInt(d.y, y);

  d.isOpen = d.isOpen === true;
  d.isSecured = d.isSecured === true;
  d.barricadeLevel = clamp(nInt(d.barricadeLevel, 0), 0, nInt(DOOR.MAX_BARRICADE_LEVEL, 5));
  d.isDestroyed = d.isDestroyed === true;

  if (isDestroyedDoor(d)) {
    d.isDestroyed = true;
    d.isOpen = true;
    d.isSecured = false;
    d.barricadeLevel = 0;
    d.hp = 0;
    return d;
  }

  const maxHp = computeDoorHp(d);
  const curHp = Number.isFinite(d.hp) ? nInt(d.hp, maxHp) : maxHp;
  d.hp = clamp(curHp, 0, maxHp);

  if (d.hp <= 0) {
    d.isDestroyed = true;
    d.isOpen = true;
    d.isSecured = false;
    d.barricadeLevel = 0;
    d.hp = 0;
  }

  return d;
}

function isDoorBlockingZombie(d) {
  if (!d) return false;
  if (d.isOpen === true) return false;
  if (isDestroyedDoor(d)) return false;
  return true; // closed + hp>0 blocks
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
  computeDoorHp,
  doorDamageFromCfg,
};