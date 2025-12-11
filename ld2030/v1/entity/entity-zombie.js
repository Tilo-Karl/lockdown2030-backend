// ld2030/v1/entity/entity-zombie.js
// Zombie configs.

const { ACTOR_BASE } = require('./entity-base');

const ZOMBIE_WALKER = {
  ...ACTOR_BASE,
  type: 'ZOMBIE',
  species: 'zombie',
  kind: 'WALKER',
  baseHp: 60,
  baseAp: 2,
  baseAttackDamage: 8,
  attackApCost: 1,
  baseHitChance: 0.75,
  baseArmor: 0,
  visionRange: 5,
  aggroRange: 4,
  faction: 'undead',
  tags: ['role:zombie', 'faction:undead', 'hostile:true'],
};

module.exports = {
  ZOMBIE_WALKER,
};