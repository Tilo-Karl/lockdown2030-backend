// ld2030/v1/entity/zombies/zombie.js

const { BASE_ACTOR } = require('../base-actor');

// 4 zombies: WALKER, RUNNER, SMART, HULK
const ZOMBIE_WALKER = {
  ...BASE_ACTOR,
  type: 'ZOMBIE',
  kind: 'WALKER',
  name: 'Walker',
  tags: ['ai:hostile'],

  maxHp: 60,
  maxAp: 2,
  currentHp: 60,
  currentAp: 2,

  speed: 1,
  attackDamage: 8,
  hitChance: 0.7,
  aggroRange: 4,
};

const ZOMBIE_RUNNER = {
  ...BASE_ACTOR,
  type: 'ZOMBIE',
  kind: 'RUNNER',
  name: 'Runner',
  tags: ['ai:hostile'],

  maxHp: 40,
  maxAp: 3,
  currentHp: 40,
  currentAp: 3,

  speed: 2,
  attackDamage: 7,
  hitChance: 0.75,
  aggroRange: 6,
};

const ZOMBIE_SMART = {
  ...BASE_ACTOR,
  type: 'ZOMBIE',
  kind: 'SMART',
  name: 'Smart Zombie',
  tags: ['ai:hostile', 'ai:smart'],

  maxHp: 55,
  maxAp: 3,
  currentHp: 55,
  currentAp: 3,

  speed: 1,
  attackDamage: 9,
  hitChance: 0.85,
  defense: 1,
  aggroRange: 7,
};

const ZOMBIE_HULK = {
  ...BASE_ACTOR,
  type: 'ZOMBIE',
  kind: 'HULK',
  name: 'Hulk',
  tags: ['ai:hostile'],

  maxHp: 140,
  maxAp: 2,
  currentHp: 140,
  currentAp: 2,

  speed: 1,
  attackDamage: 20,
  hitChance: 0.6,
  armor: 3,
  aggroRange: 5,
};

module.exports = {
  ZOMBIE_WALKER,
  ZOMBIE_RUNNER,
  ZOMBIE_SMART,
  ZOMBIE_HULK,
};