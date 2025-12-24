// ld2030/v1/entity/items/weapon.js
// Item templates: weapons (melee + ranged)

const { ITEM_WEAPON_BASE } = require('../base-item');

// RANGED

const ITEM_WEAPON_CROSSBOW = {
  ...ITEM_WEAPON_BASE,
  kind: 'CROSSBOW',
  name: 'Crossbow',
  description: 'Quiet ranged weapon. Needs bolts.',
  tags: ['item:weapon', 'ranged', 'silent'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 18,
  hitChanceBonus: -0.05,
  range: 3,
  attackApCost: 2,

  usesAmmo: true,
  ammoType: 'BOLT',
  ammoPerAttack: 1,

  weight: 4,
  value: 180,
  durabilityMax: 260,
  loudness: 0,
};

const ITEM_WEAPON_PISTOL = {
  ...ITEM_WEAPON_BASE,
  kind: 'PISTOL',
  name: '9mm Pistol',
  description: 'Compact firearm. Loud. Uses 9mm ammo.',
  tags: ['item:weapon', 'ranged', 'gun'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 14,
  hitChanceBonus: 0.05,
  range: 3,
  attackApCost: 2,

  usesAmmo: true,
  ammoType: 'AMMO_9MM',
  ammoPerAttack: 1,

  loudness: 3,
  weight: 2,
  value: 220,
  durabilityMax: 240,
};

const ITEM_WEAPON_SHOTGUN = {
  ...ITEM_WEAPON_BASE,
  kind: 'SHOTGUN',
  name: 'Shotgun',
  description: 'Close-range monster. Uses shells.',
  tags: ['item:weapon', 'ranged', 'gun'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 22,
  hitChanceBonus: -0.05,
  range: 2,
  attackApCost: 2,

  usesAmmo: true,
  ammoType: 'AMMO_SHELL',
  ammoPerAttack: 1,

  loudness: 4,
  weight: 5,
  value: 260,
  durabilityMax: 260,
};

const ITEM_WEAPON_RIFLE = {
  ...ITEM_WEAPON_BASE,
  kind: 'RIFLE',
  name: 'Hunting Rifle',
  description: 'Longer range. Uses 5.56 ammo.',
  tags: ['item:weapon', 'ranged', 'gun'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 20,
  hitChanceBonus: 0.1,
  range: 4,
  attackApCost: 2,

  usesAmmo: true,
  ammoType: 'AMMO_556',
  ammoPerAttack: 1,

  loudness: 4,
  weight: 5,
  value: 300,
  durabilityMax: 280,
};

// MELEE

const ITEM_WEAPON_KNIFE = {
  ...ITEM_WEAPON_BASE,
  kind: 'KNIFE',
  name: 'Knife',
  description: 'Fast. Cheap. Gets stuck sometimes.',
  tags: ['item:weapon', 'melee', 'blade'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 8,
  hitChanceBonus: 0.05,
  range: 1,
  attackApCost: 1,

  weight: 1,
  value: 30,
  durabilityMax: 120,
};

const ITEM_WEAPON_BAT = {
  ...ITEM_WEAPON_BASE,
  kind: 'BASEBALL_BAT',
  name: 'Baseball Bat',
  description: 'Blunt weapon. Reliable.',
  tags: ['item:weapon', 'melee', 'blunt'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 10,
  hitChanceBonus: 0,
  range: 1,
  attackApCost: 1,

  weight: 3,
  value: 25,
  durabilityMax: 160,
};

const ITEM_WEAPON_PIPE = {
  ...ITEM_WEAPON_BASE,
  kind: 'PIPE',
  name: 'Metal Pipe',
  description: 'Heavy blunt weapon. Hits hard.',
  tags: ['item:weapon', 'melee', 'blunt'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 12,
  hitChanceBonus: -0.02,
  range: 1,
  attackApCost: 1,

  weight: 4,
  value: 18,
  durabilityMax: 220,
};

const ITEM_WEAPON_MACHETE = {
  ...ITEM_WEAPON_BASE,
  kind: 'MACHETE',
  name: 'Machete',
  description: 'Sharp, nasty, effective.',
  tags: ['item:weapon', 'melee', 'blade'],

  slot: 'weapon',
  slotKey: 'main',
  layer: null,

  damage: 14,
  hitChanceBonus: 0,
  range: 1,
  attackApCost: 1,

  weight: 2,
  value: 60,
  durabilityMax: 220,
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
};