/* ld2030/v1/entity/items/item-armor.js */

const { makeArmor } = require('./item-base');

module.exports = {
  ARMOR_POLICE_VEST: makeArmor({
    id: 'ARMOR_POLICE_VEST',
    label: 'Police Vest',
    defense: 4,
    durability: 140,
    rarity: 'uncommon',
    value: 75,
  }),

  ARMOR_RIOT_HELMET: makeArmor({
    id: 'ARMOR_RIOT_HELMET',
    label: 'Riot Helmet',
    defense: 3,
    durability: 160,
    rarity: 'rare',
    value: 85,
  }),

  ARMOR_JACKET: makeArmor({
    id: 'ARMOR_JACKET',
    label: 'Jacket',
    defense: 1,
    durability: 80,
    rarity: 'common',
    value: 12,
  }),
};