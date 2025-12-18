// ld2030/v1/engine/door-service.js
// Door rules + normalization helpers.
// Owns Quarantine-style semantics so engine.js stays small.

const { DOOR } = require('../config');
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

function makeDoorService({ reader } = {}) {
  function doorIdForTile(x, y) {
    return `d_${x}_${y}`;
  }

  function doorDefaults(x, y) {
    return {
      doorId: doorIdForTile(x, y),
      x,
      y,
      isOpen: false,
      isSecured: false,
      barricadeLevel: 0,
      broken: false,
      hp: 0,
    };
  }

  function computeDoorHp(d) {
    if (d?.broken === true) return 0;

    const lvl = clamp(
      nInt(d?.barricadeLevel, 0),
      0,
      nInt(DOOR.MAX_BARRICADE_LEVEL, 5)
    );

    const base = nInt(DOOR.BASE_HP, 10);
    const secure = d?.isSecured === true ? nInt(DOOR.SECURE_HP_BONUS, 5) : 0;
    const per = nInt(DOOR.HP_PER_LEVEL, 10);

    return Math.max(0, base + secure + (lvl * per));
  }

  function normalizeDoor(x, y, door) {
    const base = doorDefaults(x, y);
    const d = (door && typeof door === 'object') ? { ...base, ...door } : { ...base };

    d.x = nInt(d.x, x);
    d.y = nInt(d.y, y);

    d.isOpen = nBool(d.isOpen);
    d.isSecured = nBool(d.isSecured);
    d.broken = nBool(d.broken);

    d.barricadeLevel = clamp(
      nInt(d.barricadeLevel, 0),
      0,
      nInt(DOOR.MAX_BARRICADE_LEVEL, 5)
    );

    // Broken doors are effectively open and cannot be secured/barricaded.
    if (d.broken === true) {
      d.isOpen = true;
      d.isSecured = false;
      d.barricadeLevel = 0;
      d.hp = 0;
      return d;
    }

    d.hp = computeDoorHp(d);
    return d;
  }

  async function loadDoorOrDefault({ gameId, x, y }) {
    const doorId = doorIdForTile(x, y);
    const door =
      (reader && typeof reader.getDoor === 'function')
        ? await reader.getDoor(gameId, doorId)
        : null;

    return normalizeDoor(x, y, door);
  }

  // Quarantine: entering from outside is blocked if secured OR barricaded.
  // Broken doors do not block.
  function isEnterBlockedFromOutside(d) {
    if (!d) return false;
    if (d.broken === true) return false;
    const lvl = nInt(d.barricadeLevel, 0);
    return d.isSecured === true || lvl > 0;
  }

  function applySecure(d) {
    if (!d) throw new Error('SECURE_DOOR: missing_door');
    if (d.broken === true) throw new Error('SECURE_DOOR: door_broken');
    if (d.isOpen === true) throw new Error('SECURE_DOOR: must_be_closed');

    const next = { ...d, isSecured: true, isOpen: false };
    next.hp = computeDoorHp(next);
    return next;
  }

  function applyBarricade(d) {
    if (!d) throw new Error('BARRICADE_DOOR: missing_door');
    if (d.broken === true) throw new Error('BARRICADE_DOOR: door_broken');
    if (d.isOpen === true) throw new Error('BARRICADE_DOOR: must_be_closed');

    const maxLvl = nInt(DOOR.MAX_BARRICADE_LEVEL, 5);
    const curLvl = nInt(d.barricadeLevel, 0);
    if (curLvl >= maxLvl) throw new Error('BARRICADE_DOOR: max_level');

    const next = {
      ...d,
      isSecured: true,     // barricade implies secured
      isOpen: false,
      barricadeLevel: curLvl + 1,
    };
    next.hp = computeDoorHp(next);
    return next;
  }

  // Debarricade is inside-only:
  // - if barricadeLevel > 0: decrement one level (secure chair remains)
  // - else if isSecured: remove the secure chair
  function applyDebarricade(d) {
    if (!d) throw new Error('DEBARRICADE_DOOR: missing_door');
    if (d.broken === true) throw new Error('DEBARRICADE_DOOR: door_broken');

    const curLvl = nInt(d.barricadeLevel, 0);

    if (curLvl > 0) {
      const nextLvl = Math.max(0, curLvl - 1);
      const next = {
        ...d,
        isOpen: false,
        barricadeLevel: nextLvl,
        isSecured: true, // chair stage still there even when boards removed
      };
      next.hp = computeDoorHp(next);
      return next;
    }

    if (d.isSecured === true) {
      const next = { ...d, isOpen: false, isSecured: false, barricadeLevel: 0 };
      next.hp = computeDoorHp(next);
      return next;
    }

    throw new Error('DEBARRICADE_DOOR: nothing_to_remove');
  }

  // Repair: broken -> repaired AND OPEN (your rule)
  function applyRepair(d) {
    if (!d) throw new Error('REPAIR_DOOR: missing_door');
    if (d.broken !== true) throw new Error('REPAIR_DOOR: not_broken');

    const next = {
      ...d,
      broken: false,
      isOpen: true,
      isSecured: false,
      barricadeLevel: 0,
    };
    next.hp = computeDoorHp(next);
    return next;
  }

  // Implicit exit: door becomes unsecured automatically (chair collapses).
  function patchForImplicitExit() {
    return { isSecured: false };
  }

  return {
    doorIdForTile,
    doorDefaults,
    normalizeDoor,
    loadDoorOrDefault,
    computeDoorHp,
    isEnterBlockedFromOutside,
    applySecure,
    applyBarricade,
    applyDebarricade,
    applyRepair,
    patchForImplicitExit,
  };
}

module.exports = { makeDoorService };