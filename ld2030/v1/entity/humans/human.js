// ld2030/v1/entity/humans/human.js
//
// FINAL HUMAN DOCS (spawn-ready):
// - This file exports complete docs you can write as-is.
// - Spawner/join may ONLY override: pos, createdAt, updatedAt, id/docId.
//
// Goal: make it obvious where fields originate via comment sections.

const { BASE_ACTOR } = require('../base-actor');

// ---------------------------------------------------------------------------
// HUMAN_BASE (common to all humans)
// ---------------------------------------------------------------------------
const HUMAN_BASE = {
  // -------------------------------------------------------------------------
  // FROM base-entity.js (via base-actor.js): identity defaults
  // -------------------------------------------------------------------------
  ...BASE_ACTOR,

  // -------------------------------------------------------------------------
  // HUMAN / identity (overrides)
  // -------------------------------------------------------------------------
  type: 'HUMAN',

  // -------------------------------------------------------------------------
  // HUMAN / common behavior flags
  // -------------------------------------------------------------------------
  alive: true,
  isDowned: false,
  hostileTo: [],

  // -------------------------------------------------------------------------
  // HUMAN / resources (FINAL defaults you control)
  // -------------------------------------------------------------------------
  maxHp: 100,
  currentHp: 100,
  maxAp: 12,
  currentAp: 12,

  hunger: 0,
  hydration: 0,
  stress: 0,

  // -------------------------------------------------------------------------
  // HUMAN / movement + combat defaults
  // -------------------------------------------------------------------------
  moveApCost: 1,
  attackApCost: 2,
  attackDamage: 8,
  hitChance: 0.75,
  armor: 0,
  defense: 0,
  speed: 1,
  visionRange: 6,
  aggroRange: 0,

  // -------------------------------------------------------------------------
  // HUMAN / carry + inventory defaults
  // -------------------------------------------------------------------------
  carryCap: 20,
  carryUsed: 0,
  encumbered: false,
  encumberedBy: 0,

  inventory: [],

  // equipment stays from BASE_ACTOR unless you want to simplify it here
};

// ---------------------------------------------------------------------------
// Variants (only override what differs from HUMAN_BASE)
// ---------------------------------------------------------------------------

const HUMAN_PLAYER = {
  ...HUMAN_BASE,

  // identity
  kind: 'PLAYER',
  name: 'Survivor',
  tags: ['faction:survivor'],
  isPlayer: true,
  faction: 'survivor',

  // tuning (still FINAL)
  maxHp: 110,
  currentHp: 110,
  maxAp: 50,
  currentAp: 50,
  attackDamage: 10,
  hitChance: 0.85,
  carryCap: 25,
  aggroRange: 0,
};

const HUMAN_RAIDER = {
  ...HUMAN_BASE,

  // identity
  kind: 'RAIDER',
  name: 'Raider',
  tags: ['faction:raiders', 'ai:hostile'],
  isPlayer: false,
  faction: 'raiders',
  hostileTo: ['survivor', 'neutral'],

  // tuning
  maxHp: 125,
  currentHp: 125,
  maxAp: 12,
  currentAp: 12,
  attackDamage: 12,
  hitChance: 0.8,
  armor: 1,
  aggroRange: 6,
  carryCap: 18,
};

const HUMAN_TRADER = {
  ...HUMAN_BASE,

  // identity
  kind: 'TRADER',
  name: 'Trader',
  tags: ['faction:neutral', 'ai:passive'],
  isPlayer: false,
  faction: 'neutral',

  // tuning
  maxHp: 85,
  currentHp: 85,
  maxAp: 10,
  currentAp: 10,
  attackDamage: 4,
  hitChance: 0.6,
  carryCap: 30,
  aggroRange: 0,
};

const HUMAN_CIVILIAN = {
  ...HUMAN_BASE,

  // identity (minimal overrides)
  kind: 'CIVILIAN',
  name: 'Civilian',
  tags: ['faction:neutral', 'ai:passive'],
  isPlayer: false,
  faction: 'neutral',

  // keep base stats (or tweak slightly if you want)
};

module.exports = {
  HUMAN_BASE,
  HUMAN_PLAYER,
  HUMAN_TRADER,
  HUMAN_RAIDER,
  HUMAN_CIVILIAN,
};