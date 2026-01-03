// ld2030/v1/entity/base-item.js

const { BASE_ENTITY } = require('./base-entity');

const BASE_ITEM = {
  ...BASE_ENTITY,
  type: 'ITEM',

  kind: 'ITEM',
  name: 'Item',
  description: '',

  tags: [],

  destructible: true,
  durabilityMax: 50,
  durability: 50,

  // Carried items are owned by an actorId.
  carriedBy: null,

  // Economy + weight
  weight: 1,
  value: 0,

  // Stack model (ammo/consumables)
  stackable: false,
  stackMax: 1,
  quantity: 1,

  // Adds to actor.carryCap when equipped (backpack/cart).
  carryBonus: 0,

  // ---------------------------------------------------------------------------
  // Equip model
  // ---------------------------------------------------------------------------
  // slot     = equipment group on actor (weapon/back/cart/body)
  // slotKey  = key within that group (main/backpack/cart/head/torso/legs/etc.)
  // layer    = only used when the slotKey points to a layered node (torso/legs)
  //
  // Examples:
  // - baseball bat:   slot='weapon', slotKey='main'
  // - backpack:       slot='back',   slotKey='backpack'
  // - shopping cart:  slot='cart',   slotKey='cart'
  // - hoodie:         slot='body',   slotKey='torso', layer='outer'
  // - riot vest:      slot='body',   slotKey='torso', layer='armor'
  // - helmet:         slot='body',   slotKey='head'
  slot: null,        // 'weapon' | 'back' | 'cart' | 'body' | null
  slotKey: null,     // string
  layer: null,       // 'under' | 'outer' | 'armor' | null

  range: 0,
};

// CATEGORY BASES

const ITEM_ARMOR_BASE = {
  ...BASE_ITEM,
  slot: 'body',
  slotKey: 'torso',
  layer: 'armor',

  armor: 0,
  hpBonus: 0,
  moveApPenalty: 0,
  hitChanceBonus: 0,
};

const ITEM_WEAPON_BASE = {
  ...BASE_ITEM,
  slot: 'weapon',
  slotKey: 'main',
  range: 1,

  damage: 1,
  hitChanceBonus: 0,
  attackApCost: 1,

  usesAmmo: false,
  ammoType: null,
  ammoPerAttack: 0,

  loudness: 0,
};

const ITEM_BACKPACK_BASE = {
  ...BASE_ITEM,
  slot: 'back',
  slotKey: 'backpack',
  carryBonus: 0,
};

const ITEM_CART_BASE = {
  ...BASE_ITEM,
  slot: 'cart',
  slotKey: 'cart',
  carryBonus: 0,
};

module.exports = {
  BASE_ITEM,
  ITEM_ARMOR_BASE,
  ITEM_WEAPON_BASE,
  ITEM_BACKPACK_BASE,
  ITEM_CART_BASE,
};
