// ld2030/v1/tick/zombie-stairs.js
// Zombie stairs helpers for tick.
// IMPORTANT (LOCKED):
// - isDestroyed is truth for “barricade is gone / does not block”
// - NO isBroken anywhere
// - edgeId is Big Bang e_* (inside cell z <-> z+1, layer=1)

const { STAIRS } = require('../config/config-stairs');

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

function maxHpForLevel(level) {
  const lvl = clamp(nInt(level, 0), 0, nInt(STAIRS.MAX_BARRICADE_LEVEL, 5));
  if (lvl <= 0) return 0;
  const base = nInt(STAIRS.BASE_HP, 0);
  const per = nInt(STAIRS.HP_PER_LEVEL, 12);
  return Math.max(0, base + (lvl * per));
}

function computeStairsHp(e) {
  return maxHpForLevel(nInt(e?.barricadeLevel, 0));
}

function isDestroyedStairs(e) {
  const hp = Number.isFinite(e?.hp) ? Number(e.hp) : null;
  return e?.isDestroyed === true || (hp != null && hp <= 0);
}

function mergeStairsEdge(x, y, zLo, raw) {
  const base = {
    edgeId: stairsEdgeIdFor(x, y, zLo),
    kind: 'stairs',
    x,
    y,
    zLo,
    zHi: zLo + 1,

    a: insideEndpoint(x, y, zLo),
    b: insideEndpoint(x, y, zLo + 1),

    barricadeLevel: 0,
    isDestroyed: false,

    // hp=null => initialize to maxHp (when barricadeLevel>0)
    // hp=0 => destroyed truth
    hp: null,
  };

  const e = (raw && typeof raw === 'object') ? { ...base, ...raw } : { ...base };

  e.kind = 'stairs';

  e.a = normEndpoint((e.a && typeof e.a === 'object') ? e.a : base.a);
  e.b = normEndpoint((e.b && typeof e.b === 'object') ? e.b : base.b);
  e.edgeId = edgeIdFor(e.a, e.b);

  e.x = nInt(e.x, x);
  e.y = nInt(e.y, y);
  e.zLo = nInt(e.zLo, zLo);
  e.zHi = nInt(e.zHi, zLo + 1);

  e.barricadeLevel = clamp(nInt(e.barricadeLevel, 0), 0, nInt(STAIRS.MAX_BARRICADE_LEVEL, 5));
  e.isDestroyed = e.isDestroyed === true;

  // No barricade => unblocked, not destroyed.
  if (e.barricadeLevel <= 0) {
    e.barricadeLevel = 0;
    e.isDestroyed = false;
    e.hp = 0;
    return e;
  }

  if (isDestroyedStairs(e)) {
    e.isDestroyed = true;
    e.barricadeLevel = 0;
    e.hp = 0;
    return e;
  }

  const maxHp = maxHpForLevel(e.barricadeLevel);
  const curHp = Number.isFinite(e.hp) ? nInt(e.hp, maxHp) : maxHp;
  e.hp = clamp(curHp, 0, maxHp);

  if (e.hp <= 0) {
    e.isDestroyed = true;
    e.barricadeLevel = 0;
    e.hp = 0;
  }

  return e;
}

function isStairsBlockingZombie(e) {
  if (!e) return false;
  if (isDestroyedStairs(e)) return false;
  return nInt(e.barricadeLevel, 0) > 0;
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
  computeStairsHp,
  stairsDamageFromCfg,
};