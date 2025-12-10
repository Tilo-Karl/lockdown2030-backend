// ld2030/v1/entity/npc-raider.js
// Hostile human NPC (raider)

const { ACTOR_BASE } = require('./entity-base');

const HUMAN_RAIDER = {
  ...ACTOR_BASE,
  type: 'HUMAN',
  species: 'human',
  kind: 'raider',
  tags: ['npc', 'human', 'hostile', 'raider'],

  baseHp: 90,
  baseAp: 2,
  moveApCost: 1,
  attackApCost: 1,

  baseAttackDamage: 12,
  baseHitChance: 0.7,
  baseDefense: 0,

  visionRange: 6,
  aggroRange: 5,

  hpPerLevel: 3,
  attackPerLevel: 1,
  defensePerLevel: 0.3,

  xpReward: 8,
};

module.exports = {
  HUMAN_RAIDER,
};