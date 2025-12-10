// ld2030/v1/entity/entity-human.js
// Player + generic human NPC configs.

const { ACTOR_BASE } = require('./entity-base');

// Player-controlled human.
const PLAYER = {
  ...ACTOR_BASE,
  type: 'PLAYER',
  species: 'human',
  tags: ['controllable', 'faction:survivor'],

  baseHp: 100,
  baseAp: 3,
  moveApCost: 1,
  attackApCost: 1,
  baseAttackDamage: 10,
  baseHitChance: 0.8,
  baseDefense: 0,
  baseSpeed: 1,
  visionRange: 6,
  aggroRange: 0,

  hpPerLevel: 5,
  attackPerLevel: 1,
  defensePerLevel: 0.5,
  apPerLevel: 0,
  xpReward: 0,
};

// Generic human civilian / future human NPC base.
const HUMAN_CIVILIAN = {
  ...ACTOR_BASE,
  type: 'NPC',
  species: 'human',
  tags: ['civilian'],

  baseHp: 80,
  baseAp: 2,
  moveApCost: 1,
  attackApCost: 2,
  baseAttackDamage: 5,
  baseHitChance: 0.5,
  baseDefense: 0,
  baseSpeed: 1,
  visionRange: 5,
  aggroRange: 0,

  hpPerLevel: 3,
  attackPerLevel: 0.5,
  defensePerLevel: 0.2,
  apPerLevel: 0,
  xpReward: 5,
};

module.exports = {
  PLAYER,
  HUMAN_CIVILIAN,
};