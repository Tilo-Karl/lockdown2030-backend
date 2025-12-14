// ld2030/v1/entity/base-item.js

const { BASE_ENTITY } = require('./base-entity');

const BASE_ITEM = {
  ...BASE_ENTITY,
  type: 'ITEM',

  durabilityMax: 1,
  destructible: true,

  weight: 1,
  value: 0,

  carryBonus: 0,

  // equip/usage
  slot: null,        // 'weapon' | 'body' | 'head' | 'hands' | 'feet' | 'back' | 'tool' | 'gear' | null
  layer: null,       // 'base' | 'outer' | 'armor' | 'accessory' | null   (needed for hoodie + riot vest)
  range: 0,
};

// CATEGORY BASES (these are what your armor.js / weapon.js expect)

const ITEM_ARMOR_BASE = {
  ...BASE_ITEM,
  slot: 'body',
  layer: 'armor',

  armor: 0,
  hpBonus: 0,
  moveApPenalty: 0,
};

const ITEM_WEAPON_BASE = {
  ...BASE_ITEM,
  slot: 'weapon',
  range: 1,

  damage: 1,
  hitChanceBonus: 0,
  attackApCost: 1,

  usesAmmo: false,
  ammoType: null,
  ammoPerAttack: 0,

  loudness: 0,
};

module.exports = {
  BASE_ITEM,
  ITEM_ARMOR_BASE,
  ITEM_WEAPON_BASE,
};