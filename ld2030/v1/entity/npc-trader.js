// ld2030/v1/entity/npc-trader.js
// Non-hostile human NPC (trader / merchant)

const { ACTOR_BASE } = require('./entity-base');

const HUMAN_TRADER = {
  ...ACTOR_BASE,
  type: 'HUMAN',
  species: 'human',
  kind: 'trader',
  tags: ['npc', 'human', 'neutral', 'trader'],

  baseHp: 100,
  baseAp: 1,
  moveApCost: 1,
  attackApCost: 0,       // cannot attack

  baseAttackDamage: 0,
  baseDefense: 1,

  visionRange: 5,
  aggroRange: 0,        // never aggro

  hpPerLevel: 2,
  attackPerLevel: 0,
  defensePerLevel: 0.2,

  xpReward: 0,
};

module.exports = {
  HUMAN_TRADER,
};