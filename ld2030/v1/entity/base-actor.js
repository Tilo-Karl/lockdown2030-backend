// ld2030/v1/entity/base-actor.js
// Shared actor template (humans + zombies).

const { BASE_ENTITY } = require('./base-entity');

const BASE_ACTOR = {
  ...BASE_ENTITY,

  // ---------------------------------------------------------------------------
  // BASE_ENTITY / identity
  // ---------------------------------------------------------------------------
  type: 'HUMAN',   // category discriminator ('HUMAN' | 'ZOMBIE')
  kind: 'DEFAULT',
  isPlayer: false,
  faction: 'neutral',
  hostileTo: [],

  // ---------------------------------------------------------------------------
  // BASE_ACTOR / shared actor fields
  // ---------------------------------------------------------------------------
  pos: { x: 0, y: 0, z: 0, layer: 0 },
  alive: true,
  isDowned: false,
  downedAt: null,
  despawnAt: null,

  maxHp: 1,
  maxAp: 0,
  currentHp: null,
  currentAp: null,

  hunger: 0,
  hydration: 0,
  stress: 0,

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

  carryCap: 10,
  carryUsed: 0,
  encumbered: false,
  encumberedBy: 0,

  equipment: {
    weapon: { main: null, off: null },
    back: { backpack: null },
    cart: { cart: null },
    body: {
      head: null,
      hands: null,
      feet: null,
      torso: { under: null, outer: null, armor: null },
      legs: { under: null, outer: null, armor: null },
    },
  },

  inventory: [],

  intent: {
    state: 'idle',
    targetId: null,
    targetPos: null,
    updatedAt: null,
  },
};

module.exports = { BASE_ACTOR };
