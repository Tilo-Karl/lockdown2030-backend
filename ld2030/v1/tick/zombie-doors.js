// ld2030/v1/tick/zombie-doors.js

const { DOOR } = require('../config');

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

function mergeDoor(x, y, raw) {
  return raw ? { ...doorDefaults(x, y), ...raw } : null; // null means "no door doc"
}

function isDoorBlockingZombie(d) {
  if (!d) return false; // no door doc => no block
  if (d.broken === true) return false;
  if (d.isOpen === true) return false;
  return true; // closed blocks
}

function computeDoorHp(d) {
  const existing = Number.isFinite(d?.hp) ? Number(d.hp) : 0;
  if (existing > 0) return existing;

  const baseHp = Number.isFinite(DOOR?.BASE_HP) ? Number(DOOR.BASE_HP) : 3;

  // keep backward compat with older config keys
  const secureHp =
    d?.isSecured === true
      ? (Number.isFinite(DOOR?.SECURE_HP) ? Number(DOOR.SECURE_HP) : 2)
      : 0;

  const perBarr =
    Number.isFinite(DOOR?.HP_PER_BARRICADE_LEVEL)
      ? Number(DOOR.HP_PER_BARRICADE_LEVEL)
      : 3;

  const lvl = Number.isFinite(d?.barricadeLevel) ? Number(d.barricadeLevel) : 0;

  return Math.max(1, baseHp + secureHp + Math.max(0, lvl) * perBarr);
}

function doorDamageFromCfg(cfg) {
  const dmg =
    (Number.isFinite(cfg?.doorDamage) ? Number(cfg.doorDamage) : null) ??
    (Number.isFinite(cfg?.attackDamage) ? Number(cfg.attackDamage) : null) ??
    1;
  return Math.max(1, Math.trunc(dmg));
}

module.exports = {
  doorIdForTile,
  doorDefaults,
  mergeDoor,
  isDoorBlockingZombie,
  computeDoorHp,
  doorDamageFromCfg,
};