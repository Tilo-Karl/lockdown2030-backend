// ld2030/v1/entity/items/item.js

const { BASE_ITEM } = require('../base-item');

// Consumables / misc

const ITEM_MED_MEDKIT = {
  ...BASE_ITEM,
  kind: 'MEDKIT',
  name: 'Medkit',
  tags: ['item:consumable', 'heal:big'],

  weight: 2,
  value: 90,
  durabilityMax: 1,
};

const ITEM_FOOD_MRE = {
  ...BASE_ITEM,
  kind: 'MRE',
  name: 'MRE',
  tags: ['item:consumable', 'food:meal'],

  weight: 1,
  value: 25,
  durabilityMax: 1,
};

const ITEM_TOOL_TOOLKIT = {
  ...BASE_ITEM,
  kind: 'TOOLKIT',
  name: 'Toolkit',
  tags: ['item:tool', 'repair:yes'],

  // Not equipped (used from inventory)
  weight: 3,
  value: 70,
  durabilityMax: 80,
};

const ITEM_TOOL_LOCKPICK = {
  ...BASE_ITEM,
  kind: 'LOCKPICK',
  name: 'Lockpick',
  tags: ['item:tool', 'lockpick:yes'],

  // Not equipped (used from inventory)
  weight: 1,
  value: 40,
  durabilityMax: 30,

  usesMax: 30,
};

const ITEM_GEAR_PORTABLE_GENERATOR = {
  ...BASE_ITEM,
  kind: 'GENERATOR_PORTABLE',
  name: 'Portable Generator',
  tags: ['item:deployable', 'power'],

  // Not equipped (installed/deployed by actions later)
  weight: 18,
  value: 300,
  durabilityMax: 400,

  powerOutput: 3,
  fuelCap: 20,
  fuel: 0,
  fuelPerTick: 1,
  installableTo: ['SAFEHOUSE', 'OUTPOST'],
};

// Equipable containers (inventory expanders)
const ITEM_CONTAINER_BACKPACK = {
  ...BASE_ITEM,
  kind: 'BACKPACK',
  name: 'Backpack',
  tags: ['item:container', 'equip:backpack'],

  slot: 'back',
  slotKey: 'backpack',
  layer: null,

  carryBonus: 12,
  weight: 2,
  value: 60,
  durabilityMax: 140,
};

const ITEM_CONTAINER_SHOPPING_CART = {
  ...BASE_ITEM,
  kind: 'SHOPPING_CART',
  name: 'Shopping Cart',
  tags: ['item:container', 'equip:cart'],

  slot: 'cart',
  slotKey: 'cart',
  layer: null,

  carryBonus: 35,
  weight: 12,
  value: 80,
  durabilityMax: 220,

  // for later AI/noise systems
  loudness: 1,
};

module.exports = {
  ITEM_MED_MEDKIT,
  ITEM_FOOD_MRE,
  ITEM_TOOL_TOOLKIT,
  ITEM_TOOL_LOCKPICK,
  ITEM_GEAR_PORTABLE_GENERATOR,

  ITEM_CONTAINER_BACKPACK,
  ITEM_CONTAINER_SHOPPING_CART,
};