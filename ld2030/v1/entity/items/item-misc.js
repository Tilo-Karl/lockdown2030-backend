/* ld2030/v1/entity/items/item-misc.js */

const { ITEM_GENERIC } = require('./item-base');

// Shop-style misc items (SHOP_MISC)
const MISC_BATTERY = {
  ...ITEM_GENERIC,
  kind: 'SHOP_MISC',
  label: 'Battery Pack',
  baseHp: 5,
  value: 8,
};

const MISC_TOOLKIT = {
  ...ITEM_GENERIC,
  kind: 'SHOP_MISC',
  label: 'Toolkit',
  baseHp: 12,
  value: 25,
};

const MISC_WATER_BOTTLE = {
  ...ITEM_GENERIC,
  kind: 'SHOP_MISC',
  label: 'Water Bottle',
  baseHp: 5,
  value: 5,
};

module.exports = {
  MISC_BATTERY,
  MISC_TOOLKIT,
  MISC_WATER_BOTTLE,
};