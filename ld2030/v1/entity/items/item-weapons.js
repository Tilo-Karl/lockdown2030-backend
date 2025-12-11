/* ld2030/v1/entity/items/item-weapons.js */

const {
  ITEM_WEAPON_GENERIC,
} = require('./item-base');

// Police pistol (police station loot)
const ITEM_WEAPON_POLICE_PISTOL = {
  ...ITEM_WEAPON_GENERIC,
  kind: 'POLICE_WEAPON',
  label: 'Police Pistol',
  damage: 10,
  hitChanceBonus: 0.1,
  baseHp: 40,
  value: 75,
};

// Shop knife (shop loot)
const ITEM_WEAPON_SHOP_KNIFE = {
  ...ITEM_WEAPON_GENERIC,
  kind: 'SHOP_WEAPON',
  label: 'Shop Knife',
  damage: 6,
  hitChanceBonus: 0.05,
  baseHp: 25,
  value: 25,
};

module.exports = {
  ITEM_WEAPON_POLICE_PISTOL,
  ITEM_WEAPON_SHOP_KNIFE,
};