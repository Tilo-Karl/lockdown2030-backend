// ld2030/v1/entity/base-actor.js

const { BASE_ENTITY } = require('./base-entity');

// Actors = anything that acts in the tick loop (humans, zombies).
// Player is NOT a type. It's an actor with isPlayer: true.
//
// NOTE:
// - Templates define defaults + caps.
// - Runtime docs store currentHp/currentAp, equipment refs, and inventory item ids.
// - Derived stats (armor/moveApCost/maxHp/attackDamage/attackApCost/hitChance/carryCap/encumbered)
//   are written by services (equipment/inventory) based on templates + equipped items.
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

  alive: true,
  downed: false,
  despawnAt: null,

  maxHp: 1,
  maxAp: 0,
  currentHp: 1,
  currentAp: 0,

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