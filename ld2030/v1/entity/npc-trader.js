// ld2030/v1/entity/npc-trader.js
// Mostly non-combat trader NPCs.

const { ACTOR_BASE } = require('./entity-base');

const NPC_HUMAN_TRADER = {
  ...ACTOR_BASE,
  type: 'HUMAN_NPC',
  species: 'human',
  kind: 'TRADER',
  baseHp: 85,
  baseAp: 2,
  baseAttackDamage: 4,
  attackApCost: 1,
  baseHitChance: 0.6,
  baseArmor: 0,
  visionRange: 6,
  aggroRange: 0, // basically never auto-aggro
  faction: 'trader',
  tags: ['role:trader', 'faction:trader', 'hostile:false'],
};

module.exports = {
  NPC_HUMAN_TRADER,
};