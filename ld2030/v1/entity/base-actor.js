// ld2030/v1/entity/base-actor.js

const { BASE_ENTITY } = require('./base-entity');

// Actors = anything that acts in the tick loop (humans, zombies).
// Player is NOT a type. It's an actor with isPlayer: true.
//
// NOTE:
// - Templates define defaults + caps.
// - Runtime docs store currentHp/currentAp, equipment refs, and inventory item ids.
// - We still include empty defaults here so every actor doc has the same shape.
const BASE_ACTOR = {
  ...BASE_ENTITY,

  // Category discriminator (NOT "PLAYER")
  // 'HUMAN' | 'ZOMBIE'
  type: 'HUMAN',

  // Subtype within category (TRADER/RAIDER/WALKER/RUNNER/etc.)
  kind: 'DEFAULT',

  // Actor-only discriminator
  isPlayer: false,

  // --- faction / relations
  faction: 'neutral',
  // Cached hostility list (string faction names). Keep it optional and fast.
  hostileTo: [],

  // --- lifecycle flags (runtime)
  alive: true,
  downed: false,
  // Optional cleanup timestamp (ms since epoch) set by engine/spawn/despawn rules.
  despawnAt: null,

  // --- core caps/defaults
  // Templates define caps; runtime docs store currentHp/currentAp.
  maxHp: 1,
  maxAp: 0,
  currentHp: 1,
  currentAp: 0,

  moveApCost: 1,
  attackApCost: 1,

  attackDamage: 1,
  hitChance: 0.8,

  armor: 0,
  defense: 0,

  speed: 1,
  visionRange: 5,
  aggroRange: 0,

  // --- vision / awareness (stealth + AI hooks)
  noiseLevel: 0,
  alertedUntil: null,

  // --- status effects (runtime)
  // Array keeps ordering simple; engine can prune expired.
  // { type: 'bleeding'|'infected'|'stunned'|..., value: number|object, expiresAt: msEpoch|null }
  effects: [],

  // --- cooldowns & timers (runtime)
  // Per-action timers so not everything is AP-gated.
  // Values are msEpoch timestamps when the action becomes available again.
  cooldowns: {
    attackUntil: null,
    interactUntil: null,
    moveUntil: null,
  },

  // --- progression hooks (unused now, but stable shape)
  level: 1,
  xp: 0,
  perks: [],

  // --- inventory / carry (runtime)
  carryCap: 10,
  carryUsed: 0,

  // --- equipment system (slot + layer)
  // body.under + body.outer lets you wear hoodie + riot gear.
  // weapon.main is your equipped weapon.
  equipment: {
    body: {
      under: null, // itemId or null
      outer: null, // itemId or null
    },
    weapon: {
      main: null,  // itemId or null
      off: null,   // itemId or null (future)
    },
  },

  // Carried items (ids). (Future: stacks / quantities)
  inventory: [],

  // --- intent / state (AI-ready)
  // Humans and zombies can both use this; player actors can ignore it.
  intent: {
    state: 'idle',        // idle|patrol|chase|flee|interact
    targetId: null,       // entity id
    targetPos: null,      // {x,y} or null
    updatedAt: null,      // msEpoch
  },
};

module.exports = { BASE_ACTOR };