// ld2030/v1/entity/zombies/zombie.js
//
// FINAL ZOMBIE DOCS (spawn-ready):
// - Complete docs you can write as-is.
// - Spawner may ONLY override: pos, createdAt, updatedAt, id/docId.

const { BASE_ACTOR } = require('../base-actor');

// ---------------------------------------------------------------------------
// ZOMBIE_BASE (common to all zombies)
// ---------------------------------------------------------------------------
const ZOMBIE_BASE = {
  // -------------------------------------------------------------------------
  // FROM base-entity.js (via base-actor.js): identity defaults
  // -------------------------------------------------------------------------
  ...BASE_ACTOR,

  // -------------------------------------------------------------------------
  // ZOMBIE / identity (overrides)
  // -------------------------------------------------------------------------
  type: 'ZOMBIE',
  tags: ['ai:hostile'],
  faction: 'zombie',
  hostileTo: ['survivor', 'neutral'],

  // -------------------------------------------------------------------------
  // ZOMBIE / resources (FINAL defaults you control)
  // -------------------------------------------------------------------------
  maxHp: 60,
  currentHp: 60,
  maxAp: 6,
  currentAp: 6,

  hunger: 0,
  hydration: 0,
  stress: 0,

  // -------------------------------------------------------------------------
  // ZOMBIE / movement + combat defaults
  // -------------------------------------------------------------------------
  moveApCost: 1,
  attackApCost: 2,
  attackDamage: 8,
  hitChance: 0.7,
  armor: 0,
  defense: 0,
  speed: 1,
  visionRange: 5,
  aggroRange: 5,

  // -------------------------------------------------------------------------
  // ZOMBIE / carry + inventory defaults (usually irrelevant)
  // -------------------------------------------------------------------------
  carryCap: 0,
  carryUsed: 0,
  inventory: [],
};

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const ZOMBIE_WALKER = {
  ...ZOMBIE_BASE,
  kind: 'WALKER',
  name: 'Walker',

  maxHp: 70,
  currentHp: 70,
  maxAp: 6,
  currentAp: 6,
  speed: 1,
  attackDamage: 8,
  hitChance: 0.7,
  aggroRange: 4,
};

const ZOMBIE_RUNNER = {
  ...ZOMBIE_BASE,
  kind: 'RUNNER',
  name: 'Runner',

  maxHp: 50,
  currentHp: 50,
  maxAp: 8,
  currentAp: 8,
  speed: 2,
  attackDamage: 7,
  hitChance: 0.75,
  aggroRange: 6,
};

const ZOMBIE_SMART = {
  ...ZOMBIE_BASE,
  kind: 'SMART',
  name: 'Smart Zombie',
  tags: ['ai:hostile', 'ai:smart'],

  maxHp: 65,
  currentHp: 65,
  maxAp: 7,
  currentAp: 7,
  speed: 1,
  attackDamage: 9,
  hitChance: 0.85,
  defense: 1,
  aggroRange: 7,
};

const ZOMBIE_HULK = {
  ...ZOMBIE_BASE,
  kind: 'HULK',
  name: 'Hulk',

  maxHp: 160,
  currentHp: 160,
  maxAp: 5,
  currentAp: 5,
  speed: 1,
  attackDamage: 20,
  hitChance: 0.6,
  armor: 3,
  aggroRange: 5,
};

module.exports = {
  ZOMBIE_BASE,
  ZOMBIE_WALKER,
  ZOMBIE_RUNNER,
  ZOMBIE_SMART,
  ZOMBIE_HULK,
};