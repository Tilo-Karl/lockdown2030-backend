// ld2030/v1/entity/items/armor.js
// Item templates: armor + clothing (wearables)

const { ITEM_ARMOR_BASE } = require('../base-item');

// Torso armor (layered: under/outer/armor on torso)
const ITEM_ARMOR_RIOT_VEST = {
  ...ITEM_ARMOR_BASE,
  kind: 'RIOT_VEST',
  name: 'Riot Vest',
  tags: ['item:armor', 'armor:riot', 'heavy', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'armor',

  armor: 6,
  hpBonus: 20,
  moveApPenalty: 1,
  value: 250,
  weight: 6,
  durabilityMax: 250,
};

const ITEM_ARMOR_MOTORCYCLE_JACKET = {
  ...ITEM_ARMOR_BASE,
  kind: 'MOTO_JACKET',
  name: 'Motorcycle Jacket',
  tags: ['item:armor', 'armor:leather', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'armor',

  armor: 3,
  hpBonus: 8,
  moveApPenalty: 0,
  value: 120,
  weight: 3,
  durabilityMax: 180,
};

const ITEM_ARMOR_BULLETPROOF_VEST = {
  ...ITEM_ARMOR_BASE,
  kind: 'BULLETPROOF_VEST',
  name: 'Bulletproof Vest',
  tags: ['item:armor', 'armor:ballistic', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'armor',

  armor: 5,
  hpBonus: 12,
  moveApPenalty: 1,
  value: 220,
  weight: 5,
  durabilityMax: 220,
};

// Non-layered body-part wearables (single slot per part)
const ITEM_ARMOR_WORK_GLOVES = {
  ...ITEM_ARMOR_BASE,
  kind: 'WORK_GLOVES',
  name: 'Work Gloves',
  tags: ['item:armor', 'armor:utility', 'wearable'],

  slot: 'body',
  slotKey: 'hands',
  layer: null,

  armor: 1,
  hpBonus: 0,
  moveApPenalty: 0,
  value: 20,
  weight: 1,
  durabilityMax: 120,
};

const ITEM_ARMOR_HELMET = {
  ...ITEM_ARMOR_BASE,
  kind: 'HELMET',
  name: 'Helmet',
  tags: ['item:armor', 'armor:head', 'wearable'],

  slot: 'body',
  slotKey: 'head',
  layer: null,

  armor: 2,
  hpBonus: 0,
  moveApPenalty: 0,
  value: 60,
  weight: 2,
  durabilityMax: 200,
};

// Clothing (torso outer layer, plus feet)
const ITEM_CLOTHING_HOODIE = {
  ...ITEM_ARMOR_BASE,
  kind: 'HOODIE',
  name: 'Hoodie',
  tags: ['item:clothing', 'clothing:light', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'outer',

  armor: 1,
  hpBonus: 2,
  moveApPenalty: 0,
  value: 10,
  weight: 1,
  durabilityMax: 80,
};

const ITEM_CLOTHING_DENIM_JACKET = {
  ...ITEM_ARMOR_BASE,
  kind: 'DENIM_JACKET',
  name: 'Denim Jacket',
  tags: ['item:clothing', 'clothing:light', 'wearable'],

  slot: 'body',
  slotKey: 'torso',
  layer: 'outer',

  armor: 1,
  hpBonus: 3,
  moveApPenalty: 0,
  value: 18,
  weight: 2,
  durabilityMax: 120,
};

const ITEM_CLOTHING_BOOTS = {
  ...ITEM_ARMOR_BASE,
  kind: 'BOOTS',
  name: 'Boots',
  tags: ['item:clothing', 'clothing:utility', 'wearable'],

  slot: 'body',
  slotKey: 'feet',
  layer: null,

  armor: 1,
  hpBonus: 0,
  moveApPenalty: 0,
  value: 15,
  weight: 2,
  durabilityMax: 160,
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