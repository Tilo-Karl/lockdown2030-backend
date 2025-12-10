/* ld2030/v1/entity/items/item-misc.js */

const { makeMisc } = require('./item-base');

module.exports = {
  MISC_BATTERY: makeMisc({
    id: 'MISC_BATTERY',
    label: 'Battery Pack',
    rarity: 'common',
    value: 8,
  }),

  MISC_TOOLKIT: makeMisc({
    id: 'MISC_TOOLKIT',
    label: 'Toolkit',
    rarity: 'uncommon',
    value: 25,
  }),

  MISC_WATER_BOTTLE: makeMisc({
    id: 'MISC_WATER_BOTTLE',
    label: 'Water Bottle',
    rarity: 'common',
    value: 5,
  }),
};