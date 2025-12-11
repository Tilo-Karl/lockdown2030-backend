// ld2030/v1/entity/entity-human.js
// Player + baseline civilian humans.

const { ACTOR_BASE } = require('./entity-base');

// Player (you)
const PLAYER = {
  ...ACTOR_BASE,
  type: 'PLAYER',
  species: 'human',
  kind: 'PLAYER',
  baseHp: 100,
  baseAp: 3,
  baseAttackDamage: 10,
  attackApCost: 1,
  baseHitChance: 0.9,
  baseArmor: 0,
  tags: ['role:player', 'faction:survivor'],
};

// Generic civilian NPC
const HUMAN_CIVILIAN = {
  ...ACTOR_BASE,
  type: 'HUMAN_NPC',
  species: 'human',
  kind: 'CIVILIAN',
  baseHp: 80,
  baseAp: 2,
  baseAttackDamage: 5,
  attackApCost: 1,
  baseHitChance: 0.7,
  baseArmor: 0,
  faction: 'neutral',
  tags: ['role:civilian', 'faction:neutral'],
};

module.exports = {
  PLAYER,
  HUMAN_CIVILIAN,
};