// ld2030/v1/entity/entity-item.js
// Item configs (generic + weapon/armor templates).

const {
  ITEM_BASE,
  ITEM_WEAPON_BASE,
  ITEM_ARMOR_BASE,
} = require('./config-entity');

// Generic destructible world item.
const ITEM_GENERIC = {
  ...ITEM_BASE,
  baseHp: 10,
};

// Generic weapon template (can be specialised later).
const ITEM_WEAPON_GENERIC = {
  ...ITEM_WEAPON_BASE,
  key: 'WEAPON_GENERIC',
};

// Generic armor / clothes template.
const ITEM_ARMOR_GENERIC = {
  ...ITEM_ARMOR_BASE,
  key: 'ARMOR_GENERIC',
};

module.exports = {
  ITEM_GENERIC,
  ITEM_WEAPON_GENERIC,
  ITEM_ARMOR_GENERIC,
};