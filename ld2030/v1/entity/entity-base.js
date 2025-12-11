// ld2030/v1/entity/entity-base.js
// Core base templates for all entities in Lockdown 2030 backend.

// Everything in the world derives conceptually from this.
const ENTITY_BASE = {
  type: 'UNKNOWN',
  species: 'unknown',
  tags: [], // free-form flags like ['faction:survivor', 'role:trader']
};

// Shared combat / movement stats for all actors (players, NPCs, zombies).
const ACTOR_BASE = {
  ...ENTITY_BASE,
  baseHp: 1,
  baseAp: 0,
  moveApCost: 1,
  attackApCost: 1,
  baseAttackDamage: 1,
  baseHitChance: 0.8,   // unified accuracy (players + NPCs + zombies)
  baseArmor: 0,
  baseDefense: 0,
  baseSpeed: 1,
  visionRange: 5,
  aggroRange: 0,

  // Level / XP growth (applied on top of base stats).
  hpPerLevel: 0,
  attackPerLevel: 0,
  defensePerLevel: 0,
  apPerLevel: 0,
  xpReward: 0,          // XP granted for killing this actor
};

// Base for all items / world objects (non-actors).
const ITEM_BASE = {
  ...ENTITY_BASE,
  type: 'ITEM',
  species: 'object',
  destructible: true,
  baseHp: 1,
  weight: 1,
  value: 0,
  armor: 0,
  damage: 0,
};

// Base for all weapons (bonus to attack / accuracy).
const ITEM_WEAPON_BASE = {
  ...ITEM_BASE,
  slot: 'weapon',
  damage: 2,
  hitChanceBonus: 0,
};

// Base for all armor / clothes.
const ITEM_ARMOR_BASE = {
  ...ITEM_BASE,
  slot: 'body',          // future: head / legs / etc.
  armor: 1,
  hpBonus: 0,
};

module.exports = {
  ENTITY_BASE,
  ACTOR_BASE,
  ITEM_BASE,
  ITEM_WEAPON_BASE,
  ITEM_ARMOR_BASE,
};