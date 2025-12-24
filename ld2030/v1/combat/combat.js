// ld2030/v1/combat/combat.js
// Pure combat math (NO Firestore, NO side effects).

function isFiniteNum(x) {
  return Number.isFinite(x);
}

function clamp01(x) {
  if (!isFiniteNum(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function computeHitChance({ baseHit, weaponBonus } = {}) {
  const b = isFiniteNum(baseHit) ? baseHit : 0;
  const w = isFiniteNum(weaponBonus) ? weaponBonus : 0;
  return clamp01(b + w);
}

function rollHit(rng, hitChance) {
  const fn = typeof rng === 'function' ? rng : Math.random;
  const hc = clamp01(hitChance);
  const r = fn();
  return r <= hc;
}

function computeDamage({ rawDamage, armor } = {}) {
  const d = isFiniteNum(rawDamage) ? rawDamage : 0;
  const a = isFiniteNum(armor) ? armor : 0;
  return Math.max(0, d - a);
}

function applyDamageToActor({ currentHp, damage } = {}) {
  const hp = isFiniteNum(currentHp) ? currentHp : 0;
  const dmg = isFiniteNum(damage) ? damage : 0;

  const nextHp = Math.max(0, hp - dmg);
  const isAlive = nextHp > 0;
  const isDowned = nextHp <= 0;

  return { nextHp, isAlive, isDowned };
}

function applyDamageToItem({ currentDurability, damage, destructible } = {}) {
  const cur = isFiniteNum(currentDurability) ? currentDurability : 0;
  const dmg = isFiniteNum(damage) ? damage : 0;
  const canBreak = destructible !== false;

  if (!canBreak) {
    return { nextDurability: cur, broken: false };
  }

  const nextDurability = Math.max(0, cur - dmg);
  const broken = nextDurability <= 0;

  return { nextDurability, broken };
}

module.exports = {
  computeHitChance,
  rollHit,
  computeDamage,
  applyDamageToActor,
  applyDamageToItem,
};