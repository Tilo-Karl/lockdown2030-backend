/* ld2030/v1/entity/items/item-base.js */

const {
  ITEM_BASE,
  ITEM_WEAPON_BASE,
  ITEM_ARMOR_BASE,
} = require('../entity-base');

// Generic destructible world item.
const ITEM_GENERIC = {
  ...ITEM_BASE,
  key: 'ITEM_GENERIC',
  baseHp: 10,       // default durability for "generic" stuff
};

// Generic weapon template (can be specialised later).
const ITEM_WEAPON_GENERIC = {
  ...ITEM_WEAPON_BASE,
  key: 'ITEM_WEAPON_GENERIC',
  baseHp: 10,       // weapons can be broken later
};

// Generic armor / clothes template.
const ITEM_ARMOR_GENERIC = {
  ...ITEM_ARMOR_BASE,
  key: 'ITEM_ARMOR_GENERIC',
  baseHp: 20,       // armor a bit tougher
};

// Generic misc template (batteries, water, toolkit, etc.)
const ITEM_MISC_GENERIC = {
  ...ITEM_BASE,
  key: 'ITEM_MISC_GENERIC',
  baseHp: 5,        // light, cheap stuff
};

// Helpers so specific items can be built on top of these.
function makeItem(overrides = {}) {
  return {
    ...ITEM_GENERIC,
    ...overrides,
  };
}

function makeWeapon(overrides = {}) {
  return {
    ...ITEM_WEAPON_GENERIC,
    ...overrides,
  };
}

function makeArmor(overrides = {}) {
  return {
    ...ITEM_ARMOR_GENERIC,
    ...overrides,
  };
}

function makeMisc(overrides = {}) {
  return {
    ...ITEM_MISC_GENERIC,
    ...overrides,
  };
}

module.exports = {
  // bases from config-entity
  ITEM_BASE,
  ITEM_WEAPON_BASE,
  ITEM_ARMOR_BASE,

  // generic destructible templates
  ITEM_GENERIC,
  ITEM_WEAPON_GENERIC,
  ITEM_ARMOR_GENERIC,
  ITEM_MISC_GENERIC,

  // builders used by item-weapons / item-armor / item-misc
  makeItem,
  makeWeapon,
  makeArmor,
  makeMisc,
};