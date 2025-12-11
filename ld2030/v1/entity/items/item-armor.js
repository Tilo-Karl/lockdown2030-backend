/* ld2030/v1/entity/items/item-armor.js */

const {
  ITEM_ARMOR_GENERIC,
} = require('./item-base');

// Police vest (police station loot)
const ITEM_ARMOR_POLICE_VEST = {
  ...ITEM_ARMOR_GENERIC,
  kind: 'POLICE_ARMOR',
  label: 'Police Vest',
  armor: 3,
  baseHp: 60,
  value: 90,
};

module.exports = {
  ITEM_ARMOR_POLICE_VEST,
};