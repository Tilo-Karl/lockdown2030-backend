/* ld2030/v1/entity/items/item-base.js */

const {
  ITEM_BASE,
  ITEM_WEAPON_BASE,
  ITEM_ARMOR_BASE,
} = require('../entity-base');

// Generic destructible world item.
const ITEM_GENERIC = {
  ...ITEM_BASE,
  kind: 'GENERIC',
  baseHp: 10,
};

// Generic weapon template (can be specialised later).
const ITEM_WEAPON_GENERIC = {
  ...ITEM_WEAPON_BASE,
  kind: 'WEAPON_GENERIC',
  baseHp: 10,       // weapons can be broken later
};

// Generic armor / clothes template.
const ITEM_ARMOR_GENERIC = {
  ...ITEM_ARMOR_BASE,
  kind: 'ARMOR_GENERIC',
  baseHp: 20,       // armor a bit tougher
};

module.exports = {
  ITEM_GENERIC,
  ITEM_WEAPON_GENERIC,
  ITEM_ARMOR_GENERIC,
};