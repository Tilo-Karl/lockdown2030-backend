// Stair-edge barricade rules + normalization.
// Edge is per-building between floors (zLo <-> zHi). Blocks stairs if barricaded and not broken.

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

function sanitizeId(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function makeStairService({ reader } = {}) {
  function edgeIdFor(buildingId, zA, zB) {
    const a = nInt(zA, 0);
    const b = nInt(zB, 0);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return `s_${sanitizeId(buildingId)}_${lo}_${hi}`;
  }

  function edgeDefaults(buildingId, zA, zB) {
    const a = nInt(zA, 0);
    const b = nInt(zB, 0);
    const zLo = Math.min(a, b);
    const zHi = Math.max(a, b);

    return {
      edgeId: edgeIdFor(buildingId, zLo, zHi),
      buildingId: String(buildingId || ''),
      zLo,
      zHi,
      barricadeLevel: 0,
      broken: false, // means barricade is destroyed/cleared
      hp: 0,         // current HP of the barricade (0 when no barricade)
    };
  }

  function maxHpForLevel(level) {
    const lvl = clamp(nInt(level, 0), 0, nInt(STAIRS.MAX_BARRICADE_LEVEL, 5));
    if (lvl <= 0) return 0;
    const base = nInt(STAIRS.BASE_HP, 0);
    const per = nInt(STAIRS.HP_PER_LEVEL, 12);
    return Math.max(0, base + (lvl * per));
  }

  function normalizeEdge(buildingId, zA, zB, edge) {
    const base = edgeDefaults(buildingId, zA, zB);
    const e = (edge && typeof edge === 'object') ? { ...base, ...edge } : { ...base };

    e.buildingId = String(e.buildingId || base.buildingId);
    e.zLo = nInt(e.zLo, base.zLo);
    e.zHi = nInt(e.zHi, base.zHi);

    e.barricadeLevel = clamp(
      nInt(e.barricadeLevel, 0),
      0,
      nInt(STAIRS.MAX_BARRICADE_LEVEL, 5)
    );

    e.broken = nBool(e.broken);

    // No barricade = not broken, no HP
    if (e.barricadeLevel <= 0) {
      e.barricadeLevel = 0;
      e.broken = false;
      e.hp = 0;
      return e;
    }

    // If "broken", barricade is gone.
    if (e.broken === true) {
      e.barricadeLevel = 0;
      e.hp = 0;
      return e;
    }

    // Keep current hp if present, otherwise initialize to max.
    const maxHp = maxHpForLevel(e.barricadeLevel);
    const curHp = nInt(e.hp, maxHp);

    // Clamp to [0..maxHp] without resetting damage upward.
    e.hp = clamp(curHp, 0, maxHp);

    // If hp hit 0, consider it broken.
    if (e.hp <= 0) {
      e.broken = true;
      e.barricadeLevel = 0;
      e.hp = 0;
    }

    return e;
  }

  async function loadEdgeOrDefault({ gameId, buildingId, zFrom, zTo }) {
    const edgeId = edgeIdFor(buildingId, zFrom, zTo);
    const edge =
      (reader && typeof reader.getStairEdge === 'function')
        ? await reader.getStairEdge(gameId, edgeId)
        : null;

    return normalizeEdge(buildingId, zFrom, zTo, edge);
  }

  function isBlocked(e) {
    if (!e) return false;
    if (e.broken === true) return false;
    const lvl = nInt(e.barricadeLevel, 0);
    return lvl > 0;
  }

  function applyBarricade(e) {
    if (!e) throw new Error('BARRICADE_STAIRS: missing_edge');

    const maxLvl = nInt(STAIRS.MAX_BARRICADE_LEVEL, 5);
    const curLvl = nInt(e.barricadeLevel, 0);

    if (curLvl >= maxLvl) throw new Error('BARRICADE_STAIRS: max_level');

    const nextLvl = curLvl + 1;
    const next = {
      ...e,
      broken: false,
      barricadeLevel: nextLvl,
      hp: maxHpForLevel(nextLvl),
    };
    return next;
  }

  function applyDebarricade(e) {
    if (!e) throw new Error('DEBARRICADE_STAIRS: missing_edge');

    const curLvl = nInt(e.barricadeLevel, 0);
    if (curLvl <= 0) throw new Error('DEBARRICADE_STAIRS: nothing_to_remove');

    const nextLvl = Math.max(0, curLvl - 1);
    if (nextLvl <= 0) {
      return { ...e, barricadeLevel: 0, broken: false, hp: 0 };
    }

    return {
      ...e,
      broken: false,
      barricadeLevel: nextLvl,
      hp: maxHpForLevel(nextLvl),
    };
  }

  function applyDamage(e, dmg) {
    if (!e) throw new Error('STAIRS_EDGE_DAMAGE: missing_edge');

    const damage = Math.max(0, nInt(dmg, 0));
    if (damage <= 0) return { ...e };

    const curHp = nInt(e.hp, 0);
    const nextHp = Math.max(0, curHp - damage);

    if (nextHp <= 0) {
      return { ...e, hp: 0, broken: true, barricadeLevel: 0 };
    }

    return { ...e, hp: nextHp };
  }

  return {
    edgeIdFor,
    edgeDefaults,
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