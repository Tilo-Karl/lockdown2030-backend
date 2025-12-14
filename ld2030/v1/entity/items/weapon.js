// ld2030/v1/entity/items/weapon.js
// Item templates: weapons (melee + ranged)

const { ITEM_WEAPON_BASE } = require('../base-item');

// RANGED

const ITEM_WEAPON_CROSSBOW = {
  ...ITEM_WEAPON_BASE,
  kind: 'CROSSBOW',
  name: 'Crossbow',
  tags: ['weapon', 'ranged', 'silent'],
  slot: 'weapon',

  // Combat
  damage: 18,
  hitChanceBonus: -0.05,
  range: 3,                 // tiles
  attackApCost: 2,

  // Ammo model (simple, later you can make ammo items)
  usesAmmo: true,
  ammoType: 'BOLT',
  ammoPerAttack: 1,
};

const ITEM_WEAPON_PISTOL = {
  ...ITEM_WEAPON_BASE,
  kind: 'PISTOL',
  name: '9mm Pistol',
  tags: ['weapon', 'ranged', 'gun'],
  slot: 'weapon',

  damage: 14,
  hitChanceBonus: 0.05,
  range: 3,
  attackApCost: 2,

  usesAmmo: true,
  ammoType: '9MM',
  ammoPerAttack: 1,

  loudness: 3,              // attracts zombies later
};

const ITEM_WEAPON_SHOTGUN = {
  ...ITEM_WEAPON_BASE,
  kind: 'SHOTGUN',
  name: 'Shotgun',
  tags: ['weapon', 'ranged', 'gun'],
  slot: 'weapon',

  damage: 22,
  hitChanceBonus: -0.05,
  range: 2,
  attackApCost: 2,

  usesAmmo: true,
  ammoType: 'SHELL',
  ammoPerAttack: 1,

  loudness: 4,
};

const ITEM_WEAPON_RIFLE = {
  ...ITEM_WEAPON_BASE,
  kind: 'RIFLE',
  name: 'Hunting Rifle',
  tags: ['weapon', 'ranged', 'gun'],
  slot: 'weapon',

  damage: 20,
  hitChanceBonus: 0.10,
  range: 4,
  attackApCost: 2,

  usesAmmo: true,
  ammoType: '556',
  ammoPerAttack: 1,

  loudness: 4,
};

// MELEE

const ITEM_WEAPON_KNIFE = {
  ...ITEM_WEAPON_BASE,
  kind: 'KNIFE',
  name: 'Knife',
  tags: ['weapon', 'melee', 'blade'],
  slot: 'weapon',

  damage: 8,
  hitChanceBonus: 0.05,
  range: 1,
  attackApCost: 1,
};

const ITEM_WEAPON_BAT = {
  ...ITEM_WEAPON_BASE,
  kind: 'BASEBALL_BAT',
  name: 'Baseball Bat',
  tags: ['weapon', 'melee', 'blunt'],
  slot: 'weapon',

  damage: 10,
  hitChanceBonus: 0.00,
  range: 1,
  attackApCost: 1,
};

const ITEM_WEAPON_PIPE = {
  ...ITEM_WEAPON_BASE,
  kind: 'PIPE',
  name: 'Metal Pipe',
  tags: ['weapon', 'melee', 'blunt'],
  slot: 'weapon',

  damage: 12,
  hitChanceBonus: -0.02,
  range: 1,
  attackApCost: 1,
};

const ITEM_WEAPON_MACHETE = {
  ...ITEM_WEAPON_BASE,
  kind: 'MACHETE',
  name: 'Machete',
  tags: ['weapon', 'melee', 'blade'],
  slot: 'weapon',

  damage: 14,
  hitChanceBonus: 0.00,
  range: 1,
  attackApCost: 1,
};

const ITEM_WEAPON_SPEAR = {
  ...ITEM_WEAPON_BASE,
  kind: 'SPEAR',
  name: 'Makeshift Spear',
  tags: ['weapon', 'melee', 'reach'],
  slot: 'weapon',

  damage: 11,
  hitChanceBonus: -0.03,
  range: 2,               // “reach” melee
  attackApCost: 1,
};

module.exports = {
  ITEM_WEAPON_CROSSBOW,
  ITEM_WEAPON_PISTOL,
  ITEM_WEAPON_SHOTGUN,
  ITEM_WEAPON_RIFLE,

  ITEM_WEAPON_KNIFE,
  ITEM_WEAPON_BAT,
  ITEM_WEAPON_PIPE,
  ITEM_WEAPON_MACHETE,
  ITEM_WEAPON_SPEAR,
};