// ld2030/v1/engine/door-service.js
// Door rules + normalization helpers.
//
// MASTER PLAN SEMANTICS (LOCKED):
// - isDestroyed: truth for “door is gone / does not block / must be open”
// - door is passable ONLY if isOpen === true OR isDestroyed === true OR hp <= 0
// - NO isBroken persisted; integrity labels are derived from hp/maxHp at UI layer
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
      barricadeLevel: 0,

      isDestroyed: false,

      // hp=null => initialize to computed maxHp (based on secured+level)
      // hp=0 => destroyed truth
      hp: null,
    };
  }

  function computeDoorHp(d) {
    if (!d) return 0;

    const destroyed = d.isDestroyed === true || (Number.isFinite(d.hp) && Number(d.hp) <= 0);
    if (destroyed) return 0;

    const lvl = clamp(nInt(d.barricadeLevel, 0), 0, nInt(DOOR.MAX_BARRICADE_LEVEL, 5));

    const base = nInt(DOOR.BASE_HP, 10);
    const secure = d.isSecured === true ? nInt(DOOR.SECURE_HP_BONUS, 5) : 0;
    const per = nInt(DOOR.HP_PER_LEVEL, 10);

    return Math.max(0, base + secure + (lvl * per));
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

    d.barricadeLevel = clamp(nInt(d.barricadeLevel, 0), 0, nInt(DOOR.MAX_BARRICADE_LEVEL, 5));
    d.isDestroyed = nBool(d.isDestroyed);

    const destroyed = d.isDestroyed === true || (Number.isFinite(d.hp) && Number(d.hp) <= 0);

    if (destroyed) {
      d.isDestroyed = true;
      d.isOpen = true;
      d.isSecured = false;
      d.barricadeLevel = 0;
      d.hp = 0;
      return d;
    }

    const maxHp = computeDoorHp({ ...d, hp: 999999 });
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
    const destroyed = d.isDestroyed === true || (Number.isFinite(d.hp) && Number(d.hp) <= 0);
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
    const maxHp = computeDoorHp(next);
    next.hp = clamp(nInt(next.hp, maxHp), 0, maxHp);
    return next;
  }

  function applyBarricade(d) {
    if (!d) throw new Error('BARRICADE_DOOR: missing_door');
    if (d.isDestroyed === true) throw new Error('BARRICADE_DOOR: door_destroyed');
    if (d.isOpen === true) throw new Error('BARRICADE_DOOR: must_be_closed');

    const maxLvl = nInt(DOOR.MAX_BARRICADE_LEVEL, 5);
    const curLvl = nInt(d.barricadeLevel, 0);
    if (curLvl >= maxLvl) throw new Error('BARRICADE_DOOR: max_level');

    const next = {
      ...d,
      isSecured: true,
      isOpen: false,
      barricadeLevel: curLvl + 1,
    };

    const maxHp = computeDoorHp(next);
    next.hp = maxHp;
    return next;
  }

  function applyDebarricade(d) {
    if (!d) throw new Error('DEBARRICADE_DOOR: missing_door');
    if (d.isDestroyed === true) throw new Error('DEBARRICADE_DOOR: door_destroyed');

    const curLvl = nInt(d.barricadeLevel, 0);

    if (curLvl > 0) {
      const nextLvl = Math.max(0, curLvl - 1);
      const next = { ...d, isOpen: false, barricadeLevel: nextLvl, isSecured: true };
      const maxHp = computeDoorHp(next);
      next.hp = maxHp;
      return next;
    }

    if (d.isSecured === true) {
      const next = { ...d, isOpen: false, isSecured: false, barricadeLevel: 0 };
      const maxHp = computeDoorHp(next);
      next.hp = clamp(nInt(next.hp, maxHp), 0, maxHp);
      return next;
    }

    throw new Error('DEBARRICADE_DOOR: nothing_to_remove');
  }

  function applyRepair(d) {
    if (!d) throw new Error('REPAIR_DOOR: missing_door');
    const destroyed = d.isDestroyed === true || (Number.isFinite(d.hp) && Number(d.hp) <= 0);
    if (!destroyed) throw new Error('REPAIR_DOOR: not_destroyed');

    const next = {
      ...d,
      isDestroyed: false,
      isOpen: true,
      isSecured: false,
      barricadeLevel: 0,
    };

    const maxHp = computeDoorHp(next);
    next.hp = maxHp;
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
    computeDoorHp,
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