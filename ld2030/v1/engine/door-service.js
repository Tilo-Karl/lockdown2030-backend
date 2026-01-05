// ld2030/v1/engine/door-service.js
// Door rules + normalization helpers.
//
// MASTER PLAN SEMANTICS (LOCKED):
// - Doors have distinct structure vs barricade durability.
// - isDestroyed reflects structureHp === 0.
// - Barricades cannot exist on destroyed doors and must be cleared before structure takes damage.
// - door is passable ONLY if isOpen === true OR structureHp === 0.
// - NO isBroken persisted; integrity labels are derived from stored maxHp values at UI layer.
//
// STORAGE:
// - Doors are edges/* documents (kind: 'door').
// - edgeId is Big Bang e_* (outside cell <-> inside cell).

const { DOOR } = require('../config/config-doors');

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

function cellIdOutside(x, y) {
  return `c_${x}_${y}_0_0`;
}

function cellIdInside(x, y) {
  return `c_${x}_${y}_0_1`;
}

function outsideEndpoint(x, y) {
  return { x, y, z: 0, layer: 0 };
}

function insideEndpoint(x, y) {
  return { x, y, z: 0, layer: 1 };
}

const STRUCTURE_BASE_HP = Math.max(0, nInt(DOOR.BASE_HP, 10));
const STRUCTURE_MAX_HP = STRUCTURE_BASE_HP;
const MAX_BARRICADE_LEVEL = Math.max(0, nInt(DOOR.MAX_BARRICADE_LEVEL, 5));
const BARRICADE_HP_PER_LEVEL = Math.max(0, nInt(DOOR.HP_PER_LEVEL, 10));

function barricadeMaxForLevel(level) {
  const lvl = clamp(nInt(level, 0), 0, MAX_BARRICADE_LEVEL);
  if (lvl <= 0) return 0;
  return Math.max(0, lvl * BARRICADE_HP_PER_LEVEL);
}

function makeDoorService({ reader } = {}) {
  function doorEdgeIdForTile(x, y) {
    return edgeIdFor(outsideEndpoint(x, y), insideEndpoint(x, y));
  }

  function doorDefaults(x, y) {
    const a = outsideEndpoint(x, y);
    const b = insideEndpoint(x, y);

    return {
      edgeId: doorEdgeIdForTile(x, y),
      kind: 'door',

      a,
      b,

      outsideCellId: cellIdOutside(x, y),
      insideCellId: cellIdInside(x, y),

      x,
      y,

      isOpen: false,
      isSecured: false,
      isDestroyed: false,

      structureHp: STRUCTURE_MAX_HP,
      structureMaxHp: STRUCTURE_MAX_HP,

      barricadeLevel: 0,
      barricadeHp: 0,
      barricadeMaxHp: 0,
    };
  }

  function normalizeDoor(x, y, edge) {
    const base = doorDefaults(x, y);
    const d = (edge && typeof edge === 'object') ? { ...base, ...edge } : { ...base };

    d.kind = 'door';

    const a = (d.a && typeof d.a === 'object') ? d.a : base.a;
    const b = (d.b && typeof d.b === 'object') ? d.b : base.b;
    d.a = normEndpoint(a);
    d.b = normEndpoint(b);

    // Hard enforce edgeId from endpoints (prevents drift)
    d.edgeId = edgeIdFor(d.a, d.b);

    d.x = nInt(d.x, x);
    d.y = nInt(d.y, y);

    d.outsideCellId = String(d.outsideCellId || base.outsideCellId);
    d.insideCellId = String(d.insideCellId || base.insideCellId);

    d.isOpen = nBool(d.isOpen);
    d.isSecured = nBool(d.isSecured);

    d.isDestroyed = nBool(d.isDestroyed);

    d.structureMaxHp = Number.isFinite(d.structureMaxHp)
      ? Math.max(0, Number(d.structureMaxHp))
      : STRUCTURE_MAX_HP;
    if (d.structureMaxHp <= 0) d.structureMaxHp = STRUCTURE_MAX_HP;

    if (!Number.isFinite(d.structureHp)) d.structureHp = d.structureMaxHp;
    d.structureHp = clamp(Number(d.structureHp), 0, d.structureMaxHp);

    if (d.structureHp <= 0) {
      d.isDestroyed = true;
      d.structureHp = 0;
    } else {
      d.isDestroyed = false;
    }

    d.barricadeLevel = clamp(nInt(d.barricadeLevel, 0), 0, MAX_BARRICADE_LEVEL);

    if (d.isDestroyed) {
      d.isOpen = true;
      d.isSecured = false;
      d.barricadeLevel = 0;
      d.barricadeHp = 0;
      d.barricadeMaxHp = 0;
      return d;
    }

    if (d.barricadeLevel <= 0) {
      d.barricadeLevel = 0;
      d.barricadeHp = 0;
      d.barricadeMaxHp = 0;
    } else {
      d.barricadeMaxHp = Number.isFinite(d.barricadeMaxHp)
        ? Math.max(0, Number(d.barricadeMaxHp))
        : barricadeMaxForLevel(d.barricadeLevel);
      if (d.barricadeMaxHp <= 0) d.barricadeMaxHp = barricadeMaxForLevel(d.barricadeLevel);
      d.barricadeHp = Number.isFinite(d.barricadeHp)
        ? clamp(Number(d.barricadeHp), 0, d.barricadeMaxHp)
        : d.barricadeMaxHp;
      if (d.barricadeHp <= 0) {
        d.barricadeLevel = 0;
        d.barricadeHp = 0;
        d.barricadeMaxHp = 0;
      }
    }

    return d;
  }

  async function loadDoorOrDefault({ gameId, x, y }) {
    const edgeId = doorEdgeIdForTile(x, y);
    const edge =
      (reader && typeof reader.getEdge === 'function')
        ? await reader.getEdge(gameId, edgeId)
        : null;

    return normalizeDoor(x, y, edge);
  }

  function isDoorPassable(d) {
    if (!d) return true; // missing edge => passable
    const destroyed = d.isDestroyed === true || nInt(d.structureHp, 0) <= 0;
    return d.isOpen === true || destroyed;
  }

  function isEnterBlockedFromOutside(d) {
    return !isDoorPassable(d);
  }

  function applySecure(d) {
    if (!d) throw new Error('SECURE_DOOR: missing_door');
    if (d.isDestroyed === true) throw new Error('SECURE_DOOR: door_destroyed');
    if (d.isOpen === true) throw new Error('SECURE_DOOR: must_be_closed');

    const next = { ...d, isSecured: true, isOpen: false };
    next.structureHp = clamp(Number(next.structureHp), 0, Number(next.structureMaxHp));
    return next;
  }

  function applyBarricade(d) {
    if (!d) throw new Error('BARRICADE_DOOR: missing_door');
    if (d.isDestroyed === true) throw new Error('BARRICADE_DOOR: door_destroyed');
    if (d.isOpen === true) throw new Error('BARRICADE_DOOR: must_be_closed');

    const maxLvl = MAX_BARRICADE_LEVEL;
    const curLvl = nInt(d.barricadeLevel, 0);
    if (curLvl >= maxLvl) throw new Error('BARRICADE_DOOR: max_level');
    if (d.structureHp < d.structureMaxHp) throw new Error('BARRICADE_DOOR: door_damaged');

    const next = {
      ...d,
      isSecured: true,
      isOpen: false,
      barricadeLevel: curLvl + 1,
    };

    next.barricadeMaxHp = barricadeMaxForLevel(next.barricadeLevel);
    next.barricadeHp = next.barricadeMaxHp;
    return next;
  }

  function applyDebarricade(d) {
    if (!d) throw new Error('DEBARRICADE_DOOR: missing_door');
    if (d.isDestroyed === true) throw new Error('DEBARRICADE_DOOR: door_destroyed');

    const curLvl = nInt(d.barricadeLevel, 0);

    if (curLvl > 0) {
      const nextLvl = Math.max(0, curLvl - 1);
      const next = { ...d, isOpen: false, barricadeLevel: nextLvl, isSecured: true };
      if (nextLvl <= 0) {
        next.barricadeLevel = 0;
        next.barricadeHp = 0;
        next.barricadeMaxHp = 0;
      } else {
        next.barricadeMaxHp = barricadeMaxForLevel(nextLvl);
        next.barricadeHp = next.barricadeMaxHp;
      }
      return next;
    }

    if (d.isSecured === true) {
      const next = { ...d, isOpen: false, isSecured: false, barricadeLevel: 0 };
      next.barricadeHp = 0;
      next.barricadeMaxHp = 0;
      return next;
    }

    throw new Error('DEBARRICADE_DOOR: nothing_to_remove');
  }

  function applyRepair(d) {
    if (!d) throw new Error('REPAIR_DOOR: missing_door');
    const destroyed = d.isDestroyed === true || nInt(d.structureHp, 0) <= 0;
    if (!destroyed) throw new Error('REPAIR_DOOR: not_destroyed');

    const next = {
      ...d,
      isDestroyed: false,
      isOpen: true,
      isSecured: false,
      barricadeLevel: 0,
    };

    next.structureHp = next.structureMaxHp;
    next.barricadeHp = 0;
    next.barricadeMaxHp = 0;
    return next;
  }

  function patchForImplicitExit() {
    return { isSecured: false };
  }

  return {
    doorEdgeIdForTile,
    doorDefaults,
    normalizeDoor,
    loadDoorOrDefault,
    isDoorPassable,
    isEnterBlockedFromOutside,
    applySecure,
    applyBarricade,
    applyDebarricade,
    applyRepair,
    patchForImplicitExit,
  };
}

module.exports = { makeDoorService };
