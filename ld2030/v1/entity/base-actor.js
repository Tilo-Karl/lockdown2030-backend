// ld2030/v1/entity/base-actor.js

const { BASE_ENTITY } = require('./base-entity');

// Actors = anything that acts in gameplay (humans, zombies).
// Player is NOT a type. It's an actor with isPlayer: true.
//
// Master-plan invariants for runtime docs:
// - pos ALWAYS exists: { x, y, z, layer }  (layer: 0=outside, 1=inside)
// - meters exist on the doc (even if some actors don't use them): hunger/hydration/stress
// - downed fields are: isDowned + downedAt  (NOT "downed")
// - currentHp/currentAp exist
const BASE_ACTOR = {
  ...BASE_ENTITY,

  // Category discriminator (NOT "PLAYER")
  // 'HUMAN' | 'ZOMBIE'
  type: 'HUMAN',

  // Subtype within category (TRADER/RAIDER/WALKER/RUNNER/etc.)
  kind: 'DEFAULT',

  // Actor-only discriminator
  isPlayer: false,

  faction: 'neutral',
  hostileTo: [],

  // Position is always present on actor docs
  pos: { x: 0, y: 0, z: 0, layer: 0 },

  alive: true,

  // Downed schema (master-plan)
  isDowned: false,
  downedAt: null,

  // Optional lifecycle (useful for NPCs/zombies; harmless for players)
  despawnAt: null,

  maxHp: 1,
  maxAp: 0,
  currentHp: 1,
  currentAp: 0,

  // Meters (master-plan)
  hunger: 0,
  hydration: 0,
  stress: 0,

  // Derived-on-doc (recomputed after equip / pickup / drop)
  moveApCost: 1,
  attackApCost: 1,
  attackDamage: 1,
  hitChance: 0.8,
  armor: 0,

  defense: 0,

  speed: 1,
  visionRange: 5,
  aggroRange: 0,

  noiseLevel: 0,
  alertedUntil: null,

  effects: [],

  cooldowns: {
    attackUntil: null,
    interactUntil: null,
    moveUntil: null,
  },

  level: 1,
  xp: 0,
  perks: [],

  // Carry system (Quarantine-style): backpacks/carts add carryBonus to carryCap.
  carryCap: 10,     // derived
  carryUsed: 0,     // derived
  encumbered: false,
  encumberedBy: 0,  // how much overweight

  // Equipment schema contract.
  equipment: {
    weapon: {
      main: null,
      off: null,
    },
    back: {
      backpack: null,
    },
    cart: {
      cart: null,
    },
    body: {
      head: null,
      hands: null,
      feet: null,

      torso: {
        under: null,
        outer: null,
        armor: null,
      },
      legs: {
        under: null,
        outer: null,
        armor: null,
      },
    },
  },

  // Carried items (ids)
  inventory: [],

  intent: {
    state: 'idle',
    targetId: null,
    targetPos: null,
    updatedAt: null,
  },
};

module.exports = { BASE_ACTOR };