// ld2030/v1/entity/items/armor.js
// Item templates: armor + clothing (wearables)

const { ITEM_ARMOR_BASE } = require('../base-item');

// “Real” armor

const ITEM_ARMOR_RIOT_VEST = {
  ...ITEM_ARMOR_BASE,
  kind: 'RIOT_VEST',
  name: 'Riot Vest',
  tags: ['armor', 'heavy'],
  slot: 'body',

  armor: 6,
  hpBonus: 20,
  moveApPenalty: 1,          // later applied in equip logic
  value: 250,
  weight: 6,
};

const ITEM_ARMOR_MOTORCYCLE_JACKET = {
  ...ITEM_ARMOR_BASE,
  kind: 'MOTO_JACKET',
  name: 'Motorcycle Jacket',
  tags: ['armor', 'leather'],
  slot: 'body',

  armor: 3,
  hpBonus: 8,
  value: 120,
  weight: 3,
};

const ITEM_ARMOR_BULLETPROOF_VEST = {
  ...ITEM_ARMOR_BASE,
  kind: 'BULLETPROOF_VEST',
  name: 'Bulletproof Vest',
  tags: ['armor', 'ballistic'],
  slot: 'body',

  armor: 5,
  hpBonus: 12,
  value: 220,
  weight: 5,
};

const ITEM_ARMOR_WORK_GLOVES = {
  ...ITEM_ARMOR_BASE,
  kind: 'WORK_GLOVES',
  name: 'Work Gloves',
  tags: ['armor', 'utility'],
  slot: 'hands',

  armor: 1,
  hpBonus: 0,
  value: 20,
  weight: 1,
};

const ITEM_ARMOR_HELMET = {
  ...ITEM_ARMOR_BASE,
  kind: 'HELMET',
  name: 'Helmet',
  tags: ['armor', 'head'],
  slot: 'head',

  armor: 2,
  hpBonus: 0,
  value: 60,
  weight: 2,
};

// Clothing-as-armor (light)

const ITEM_CLOTHING_HOODIE = {
  ...ITEM_ARMOR_BASE,
  kind: 'HOODIE',
  name: 'Hoodie',
  tags: ['clothing', 'light'],
  slot: 'body',

  armor: 1,
  hpBonus: 2,
  value: 10,
  weight: 1,
};

const ITEM_CLOTHING_DENIM_JACKET = {
  ...ITEM_ARMOR_BASE,
  kind: 'DENIM_JACKET',
  name: 'Denim Jacket',
  tags: ['clothing', 'light'],
  slot: 'body',

  armor: 1,
  hpBonus: 3,
  value: 18,
  weight: 2,
};

const ITEM_CLOTHING_BOOTS = {
  ...ITEM_ARMOR_BASE,
  kind: 'BOOTS',
  name: 'Boots',
  tags: ['clothing', 'utility'],
  slot: 'feet',

  armor: 1,
  hpBonus: 0,
  value: 15,
  weight: 2,
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