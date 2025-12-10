/* ld2030/v1/entity/items/item-weapons.js */

const { makeWeapon } = require('./item-base');

module.exports = {
  WEAPON_BATON: makeWeapon({
    id: 'WEAPON_BATON',
    label: 'Baton',
    damage: 4,
    apCost: 1,
    durability: 120,
    rarity: 'common',
    value: 15,
  }),

  WEAPON_GLOCK17: makeWeapon({
    id: 'WEAPON_GLOCK17',
    label: 'Glock 17',
    damage: 10,
    apCost: 2,
    durability: 90,
    rarity: 'uncommon',
    value: 50,
  }),

  WEAPON_SHOTGUN: makeWeapon({
    id: 'WEAPON_SHOTGUN',
    label: 'Shotgun',
    damage: 18,
    apCost: 3,
    durability: 70,
    rarity: 'rare',
    value: 100,
  }),
};