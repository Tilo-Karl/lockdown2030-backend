// ld2030/v1/engine/stair-service.js
// Stair-edge barricade rules + normalization.
//
// MASTER PLAN SEMANTICS:
// - isDestroyed: truth for “barricade is gone / does not block”
// - destroyed => barricadeLevel=0 and hp=0
//
// STORAGE:
// - Stairs barricades are edges/* documents (kind: 'stairs').
// - edgeId MUST match world/edges.js (e_* endpoint-based ids).
//
// NOTE: isBroken removed (not used for anything).

const { STAIRS } = require('../config/config-stairs');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function nBool(x) {
  return x === true;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function normEndpoint(p) {
  return {
    x: Number(p.x),
    y: Number(p.y),
    z: Number(p.z),
    layer: Number(p.layer),
  };
}

function endpointKey(p) {
  return `${p.x}_${p.y}_${p.z}_${p.layer}`;
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

function makeStairService({ reader } = {}) {
  function stairsEdgeIdFor(x, y, zA, zB) {
    const a = nInt(zA, 0);
    const b = nInt(zB, 0);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);

    const ax = nInt(x, 0);
    const ay = nInt(y, 0);

    const A = { x: ax, y: ay, z: lo, layer: 1 };
    const B = { x: ax, y: ay, z: hi, layer: 1 };
    return edgeIdFor(A, B);
  }

  function stairsDefaults({ x, y, zA, zB }) {
    const a = nInt(zA, 0);
    const b = nInt(zB, 0);
    const zLo = Math.min(a, b);
    const zHi = Math.max(a, b);

    const ax = nInt(x, 0);
    const ay = nInt(y, 0);

    const A = { x: ax, y: ay, z: zLo, layer: 1 };
    const B = { x: ax, y: ay, z: zHi, layer: 1 };

    return {
      edgeId: edgeIdFor(A, B),
      kind: 'stairs',
      a: A,
      b: B,

      x: ax,
      y: ay,
      zLo,
      zHi,

      barricadeLevel: 0,
      isDestroyed: false,

      // hp is barricade hp (0 when no barricade / destroyed)
      // hp can be null from init => treat as “initialize” only when barricaded
      hp: 0,
    };
  }

  function maxHpForLevel(level) {
    const lvl = clamp(nInt(level, 0), 0, nInt(STAIRS.MAX_BARRICADE_LEVEL, 5));
    if (lvl <= 0) return 0;
    const base = nInt(STAIRS.BASE_HP, 0);
    const per = nInt(STAIRS.HP_PER_LEVEL, 12);
    return Math.max(0, base + (lvl * per));
  }

  function normalizeEdge(params, edge) {
    const base = stairsDefaults(params);
    const e = (edge && typeof edge === 'object') ? { ...base, ...edge } : { ...base };

    e.kind = 'stairs';

    // enforce endpoints + id (prevents drift)
    const A = (e.a && typeof e.a === 'object') ? e.a : base.a;
    const B = (e.b && typeof e.b === 'object') ? e.b : base.b;
    e.a = normEndpoint(A);
    e.b = normEndpoint(B);
    e.edgeId = edgeIdFor(e.a, e.b);

    e.x = nInt(e.x, base.x);
    e.y = nInt(e.y, base.y);

    e.zLo = nInt(e.zLo, base.zLo);
    e.zHi = nInt(e.zHi, base.zHi);
    if (e.zLo > e.zHi) {
      const tmp = e.zLo;
      e.zLo = e.zHi;
      e.zHi = tmp;
    }

    e.barricadeLevel = clamp(
      nInt(e.barricadeLevel, 0),
      0,
      nInt(STAIRS.MAX_BARRICADE_LEVEL, 5)
    );

    e.isDestroyed = nBool(e.isDestroyed);

    // No barricade => unblocked, hp must be 0 (ignore hp=null from init)
    if (e.barricadeLevel <= 0) {
      e.barricadeLevel = 0;
      e.hp = 0;
      return e;
    }

    // Explicit destroyed => clear barricade
    if (e.isDestroyed === true) {
      e.barricadeLevel = 0;
      e.hp = 0;
      return e;
    }

    // Barricade exists: normalize hp (hp null => initialize to max for that level)
    const maxHp = maxHpForLevel(e.barricadeLevel);
    const curHp =
      (e.hp == null) ? maxHp : (Number.isFinite(e.hp) ? nInt(e.hp, maxHp) : maxHp);

    e.hp = clamp(curHp, 0, maxHp);

    // hp 0 => destroyed truth
    if (e.hp <= 0) {
      e.isDestroyed = true;
      e.barricadeLevel = 0;
      e.hp = 0;
    }

    return e;
  }

  async function loadEdgeOrDefault({ gameId, x, y, zFrom, zTo }) {
    const edgeId = stairsEdgeIdFor(x, y, zFrom, zTo);
    const edge =
      (reader && typeof reader.getEdge === 'function')
        ? await reader.getEdge(gameId, edgeId)
        : null;

    return normalizeEdge({ x, y, zA: zFrom, zB: zTo }, edge);
  }

  function isBlocked(e) {
    if (!e) return false;
    if (e.isDestroyed === true) return false;
    return nInt(e.barricadeLevel, 0) > 0;
  }

  function applyBarricade(e) {
    if (!e) throw new Error('BARRICADE_STAIRS: missing_edge');

    const maxLvl = nInt(STAIRS.MAX_BARRICADE_LEVEL, 5);
    const curLvl = nInt(e.barricadeLevel, 0);
    if (curLvl >= maxLvl) throw new Error('BARRICADE_STAIRS: max_level');

    const nextLvl = curLvl + 1;

    return {
      ...e,
      isDestroyed: false,
      barricadeLevel: nextLvl,
      hp: maxHpForLevel(nextLvl),
    };
  }

  function applyDebarricade(e) {
    if (!e) throw new Error('DEBARRICADE_STAIRS: missing_edge');

    const curLvl = nInt(e.barricadeLevel, 0);
    if (curLvl <= 0) throw new Error('DEBARRICADE_STAIRS: nothing_to_remove');

    const nextLvl = Math.max(0, curLvl - 1);

    if (nextLvl <= 0) {
      // manual removal => not "destroyed"
      return { ...e, barricadeLevel: 0, hp: 0, isDestroyed: false };
    }

    return {
      ...e,
      isDestroyed: false,
      barricadeLevel: nextLvl,
      hp: maxHpForLevel(nextLvl),
    };
  }

  function applyDamage(e, dmg) {
    if (!e) throw new Error('STAIRS_EDGE_DAMAGE: missing_edge');

    const damage = Math.max(0, nInt(dmg, 0));
    if (damage <= 0) return { ...e };

    const lvl = nInt(e.barricadeLevel, 0);
    if (lvl <= 0) return { ...e, barricadeLevel: 0, hp: 0 };

    const curHp = nInt(e.hp, maxHpForLevel(lvl));
    const nextHp = Math.max(0, curHp - damage);

    if (nextHp <= 0) {
      return { ...e, hp: 0, isDestroyed: true, barricadeLevel: 0 };
    }

    return { ...e, hp: nextHp, isDestroyed: false };
  }

  return {
    stairsEdgeIdFor,
    stairsDefaults,
    maxHpForLevel,
    normalizeEdge,
    loadEdgeOrDefault,
    isBlocked,
    applyBarricade,
    applyDebarricade,
    applyDamage,
  };
}

module.exports = { makeStairService };