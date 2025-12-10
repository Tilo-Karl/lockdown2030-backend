/* ld2030/v1/entity/items/entity-item.js */

const base    = require('./item-base');
const weapons = require('./item-weapons');
const armor   = require('./item-armor');
const misc    = require('./item-misc');

module.exports = {
  // Base / generic templates used by resolveEntityConfig('ITEM', 'GENERIC'/'WEAPON'/'ARMOR')
  ...base,

  // Concrete items
  ...weapons,
  ...armor,
  ...misc,
};