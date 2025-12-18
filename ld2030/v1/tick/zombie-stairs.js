// ld2030/v1/tick/zombie-stairs.js

const { STAIRS } = require('../config');

// Convention: barricade doc is keyed by the *edge floor* between z and z+1.
// So moving between floors a<->b uses edgeZ = min(a,b).
function stairIdForEdge(x, y, edgeZ) {
  return `s_${x}_${y}_${edgeZ}`;
}

function stairDefaults(x, y, edgeZ) {
  return {
    stairId: stairIdForEdge(x, y, edgeZ),
    x,
    y,
    z: edgeZ, // edge floor index
    isOpen: false,
    barricadeLevel: 0,
    broken: false,
    hp: 0,
  };
}

function mergeStair(x, y, edgeZ, raw) {
  return raw ? { ...stairDefaults(x, y, edgeZ), ...raw } : null; // null means "no stair doc"
}

function isStairBlockingZombie(s) {
  if (!s) return false; // no stair doc => no block
  if (s.broken === true) return false;
  if (s.isOpen === true) return false;
  return true; // closed blocks
}

function computeStairHp(s) {
  const existing = Number.isFinite(s?.hp) ? Number(s.hp) : 0;
  if (existing > 0) return existing;

  const baseHp = Number.isFinite(STAIRS?.BASE_HP) ? Number(STAIRS.BASE_HP) : 3;

  const perBarr =
    Number.isFinite(STAIRS?.HP_PER_BARRICADE_LEVEL)
      ? Number(STAIRS.HP_PER_BARRICADE_LEVEL)
      : 3;

  const lvl = Number.isFinite(s?.barricadeLevel) ? Number(s.barricadeLevel) : 0;

  return Math.max(1, baseHp + Math.max(0, lvl) * perBarr);
}

function stairDamageFromCfg(cfg) {
  const dmg =
    (Number.isFinite(cfg?.stairDamage) ? Number(cfg.stairDamage) : null) ??
    (Number.isFinite(cfg?.doorDamage) ? Number(cfg.doorDamage) : null) ??
    (Number.isFinite(cfg?.attackDamage) ? Number(cfg.attackDamage) : null) ??
    1;
  return Math.max(1, Math.trunc(dmg));
}

// IO adapters (supports whatever names you already used in reader/writer)
function makeStairIO({ reader, writer }) {
  async function readStair(gameId, stairId) {
    if (typeof reader.getStair === 'function') return reader.getStair(gameId, stairId);
    if (typeof reader.getStairs === 'function') return reader.getStairs(gameId, stairId);
    if (typeof reader.getStairBarricade === 'function') return reader.getStairBarricade(gameId, stairId);

    if (typeof reader.stairsCol === 'function') {
      const ref = reader.stairsCol(gameId)?.doc?.(stairId);
      if (ref && typeof ref.get === 'function') {
        const snap = await ref.get();
        return snap.exists ? (snap.data() || {}) : null;
      }
    }
    return null;
  }

  async function writeStair(gameId, stairId, data) {
    if (typeof writer.updateStair === 'function') return writer.updateStair(gameId, stairId, data);
    if (typeof writer.updateStairs === 'function') return writer.updateStairs(gameId, stairId, data);
    if (typeof writer.updateStairBarricade === 'function') return writer.updateStairBarricade(gameId, stairId, data);
    return { ok: false, skipped: true };
  }

  return { readStair, writeStair };
}

module.exports = {
  stairIdForEdge,
  stairDefaults,
  mergeStair,
  isStairBlockingZombie,
  computeStairHp,
  stairDamageFromCfg,
  makeStairIO,
};