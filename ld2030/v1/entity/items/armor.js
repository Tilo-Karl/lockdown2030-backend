// ld2030/v1/entity/items/armor.js
// Item templates: armor + clothing (wearables)

const { ITEM_ARMOR_BASE } = require('../base-item');

// Torso armor (layered: under/outer/armor on torso)
const ITEM_ARMOR_RIOT_VEST = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'RIOT_VEST',
  name: 'Riot Vest',
  description: 'Heavy protection. Slows you down.',
  tags: ['item:armor', 'armor:riot', 'heavy', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'armor',

  // ITEM_TUNING
  armor: 6,
  hpBonus: 20,
  moveApPenalty: 1,
  value: 250,
  weight: 6,
  durabilityMax: 250,

  durability: 250,
};

const ITEM_ARMOR_MOTORCYCLE_JACKET = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'MOTO_JACKET',
  name: 'Motorcycle Jacket',
  description: 'Leather. Decent protection without the bulk.',
  tags: ['item:armor', 'armor:leather', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'armor',

  // ITEM_TUNING
  armor: 3,
  hpBonus: 8,
  moveApPenalty: 0,
  value: 120,
  weight: 3,
  durabilityMax: 180,

  durability: 180,
};

const ITEM_ARMOR_BULLETPROOF_VEST = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'BULLETPROOF_VEST',
  name: 'Bulletproof Vest',
  description: 'Ballistic plates. Helps vs bites too.',
  tags: ['item:armor', 'armor:ballistic', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'armor',

  // ITEM_TUNING
  armor: 5,
  hpBonus: 12,
  moveApPenalty: 1,
  value: 220,
  weight: 5,
  durabilityMax: 220,

  durability: 220,
};

// Non-layered body-part wearables (single slot per part)
const ITEM_ARMOR_WORK_GLOVES = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'WORK_GLOVES',
  name: 'Work Gloves',
  description: 'Grip + minor protection. Fixer vibe.',
  tags: ['item:armor', 'armor:utility', 'wearable'],

  slot: 'body',
  slotKey: 'hands',
  layer: null,

  // ITEM_TUNING
  armor: 1,
  hpBonus: 0,
  moveApPenalty: 0,
  value: 20,
  weight: 1,
  durabilityMax: 120,

  durability: 120,
};

const ITEM_ARMOR_HELMET = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'HELMET',
  name: 'Helmet',
  description: 'Protects your head. Simple.',
  tags: ['item:armor', 'armor:head', 'wearable'],

  slot: 'body',
  slotKey: 'head',
  layer: null,

  // ITEM_TUNING
  armor: 2,
  hpBonus: 0,
  moveApPenalty: 0,
  value: 60,
  weight: 2,
  durabilityMax: 200,

  durability: 200,
};

// Clothing (torso outer layer, plus feet)
const ITEM_CLOTHING_HOODIE = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'HOODIE',
  name: 'Hoodie',
  description: 'Warm. Looks harmless. It’s not.',
  tags: ['item:clothing', 'clothing:light', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'outer',

  // ITEM_TUNING
  armor: 1,
  hpBonus: 2,
  moveApPenalty: 0,
  value: 10,
  weight: 1,
  durabilityMax: 80,

  durability: 80,
};

const ITEM_CLOTHING_DENIM_JACKET = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'DENIM_JACKET',
  name: 'Denim Jacket',
  description: 'Cheap armor. Better than a t-shirt.',
  tags: ['item:clothing', 'clothing:light', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'outer',

  // ITEM_TUNING
  armor: 1,
  hpBonus: 3,
  moveApPenalty: 0,
  value: 18,
  weight: 2,
  durabilityMax: 120,

  durability: 120,
};

const ITEM_CLOTHING_BOOTS = {
  ...ITEM_ARMOR_BASE,

  // BASE_ENTITY / identity
  kind: 'BOOTS',
  name: 'Boots',
  description: 'Good footing. Less slipping, more living.',
  tags: ['item:clothing', 'clothing:utility', 'wearable'],

  slot: 'body',
  slotKey: 'feet',
  layer: null,

  // ITEM_TUNING
  armor: 1,
  hpBonus: 0,
  moveApPenalty: 0,
  value: 15,
  weight: 2,
  durabilityMax: 160,

  durability: 160,
};

module.exports = {
  ITEM_ARMOR_RIOT_VEST,
  ITEM_ARMOR_MOTORCYCLE_JACKET,
  ITEM_ARMOR_BULLETPROOF_VEST,
  ITEM_ARMOR_WORK_GLOVES,
  ITEM_ARMOR_HELMET,

  ITEM_CLOTHING_HOODIE,
  ITEM_CLOTHING_DENIM_JACKET,
  ITEM_CLOTHING_BOOTS,
};
