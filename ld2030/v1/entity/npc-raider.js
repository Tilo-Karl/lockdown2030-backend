// ld2030/v1/entity/npc-raider.js
// Hostile human raider NPCs.

const { ACTOR_BASE } = require('./entity-base');

const NPC_HUMAN_RAIDER = {
  ...ACTOR_BASE,
  type: 'HUMAN_NPC',
  species: 'human',
  kind: 'RAIDER',
  baseHp: 90,
  baseAp: 3,
  baseAttackDamage: 12,
  attackApCost: 1,
  baseHitChance: 0.8,
  baseArmor: 1,
  visionRange: 7,
  aggroRange: 5,
  faction: 'raider',
  tags: ['role:raider', 'faction:raider', 'hostile:true'],
};

module.exports = {
  NPC_HUMAN_RAIDER,
};