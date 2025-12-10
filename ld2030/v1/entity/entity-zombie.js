// ld2030/v1/entity/entity-zombie.js
// Zombie base + concrete zombie kinds.

const { ACTOR_BASE } = require('./config-entity');

// Shared zombie base. Concrete kinds (walker, runner, etc.) extend this.
const ZOMBIE_BASE = {
  ...ACTOR_BASE,
  type: 'ZOMBIE',
  species: 'zombie',
  tags: ['hostile'],

  baseHp: 60,
  baseAp: 0,           // zombies usually act on tick, not AP button presses
  moveApCost: 1,
  attackApCost: 1,
  baseAttackDamage: 10,
  baseHitChance: 0.8,
  baseDefense: 0,
  baseSpeed: 1,
  visionRange: 4,
  aggroRange: 4,

  hpPerLevel: 0,
  attackPerLevel: 0,
  defensePerLevel: 0,
  apPerLevel: 0,
  xpReward: 10,
};

// For now we only have one concrete zombie kind: WALKER.
const ZOMBIE_WALKER = {
  ...ZOMBIE_BASE,
  kind: 'walker',
  tags: [...ZOMBIE_BASE.tags, 'zombie:walker'],
};

module.exports = {
  ZOMBIE_BASE,
  ZOMBIE_WALKER,
};