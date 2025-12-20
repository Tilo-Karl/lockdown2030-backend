// ld2030/v1/entity/items/item.js

const { BASE_ITEM } = require('../base-item');

// helper for stackables
function STACK(base, { stackMax, weight, value }) {
  return {
    ...base,
    stackable: true,
    stackMax,
    quantity: 1,
    weight,
    value,
    durabilityMax: 1,
  };
}

// ------------------------------
// Consumables
// ------------------------------

const ITEM_MED_MEDKIT = {
  ...BASE_ITEM,
  kind: 'MEDKIT',
  name: 'Medkit',
  description: 'Big heal. Use on yourself.',
  tags: ['item:consumable', 'heal:big'],
  weight: 2,
  value: 90,
  durabilityMax: 1,
};

const ITEM_MED_BANDAGE = {
  ...BASE_ITEM,
  kind: 'BANDAGE',
  name: 'Bandage',
  description: 'Stops bleeding. Small heal.',
  tags: ['item:consumable', 'heal:small'],
  weight: 1,
  value: 15,
  durabilityMax: 1,
};

const ITEM_MED_ANTISEPTIC = {
  ...BASE_ITEM,
  kind: 'ANTISEPTIC',
  name: 'Antiseptic',
  description: 'Cleans wounds. Helps recovery.',
  tags: ['item:consumable', 'med:clean'],
  weight: 1,
  value: 18,
  durabilityMax: 1,
};

const ITEM_MED_PAINKILLER = {
  ...BASE_ITEM,
  kind: 'PAINKILLER',
  name: 'Painkillers',
  description: 'Takes the edge off. Short-term stress relief.',
  tags: ['item:consumable', 'med:pain'],
  weight: 1,
  value: 20,
  durabilityMax: 1,
};

const ITEM_MED_STIM = {
  ...BASE_ITEM,
  kind: 'STIM',
  name: 'Stim Shot',
  description: 'Short burst of focus. Medic candy.',
  tags: ['item:consumable', 'med:stim'],
  weight: 1,
  value: 40,
  durabilityMax: 1,
};

// Dope Doc ladder (items exist; usefulness gated by skill later)
const ITEM_MED_GHOST_DOSE = {
  ...BASE_ITEM,
  kind: 'GHOST_DOSE',
  name: 'Ghost Dose',
  description: 'Makes you move quiet for a bit.',
  tags: ['item:consumable', 'dope:ghost'],
  weight: 1,
  value: 55,
  durabilityMax: 1,
};

const ITEM_MED_FOCUS_DOSE = {
  ...BASE_ITEM,
  kind: 'FOCUS_DOSE',
  name: 'Focus Dose',
  description: 'Sharpens aim for a bit.',
  tags: ['item:consumable', 'dope:focus'],
  weight: 1,
  value: 70,
  durabilityMax: 1,
};

const ITEM_MED_FURY_DOSE = {
  ...BASE_ITEM,
  kind: 'FURY_DOSE',
  name: 'Fury Dose',
  description: 'Hits harder for a bit.',
  tags: ['item:consumable', 'dope:fury'],
  weight: 1,
  value: 80,
  durabilityMax: 1,
};

// Food + drink
const ITEM_FOOD_CANNED = {
  ...BASE_ITEM,
  kind: 'CANNED_FOOD',
  name: 'Canned Food',
  description: 'Calories in a can. Ugly but reliable.',
  tags: ['item:consumable', 'food:meal'],
  weight: 1,
  value: 18,
  durabilityMax: 1,
};

const ITEM_FOOD_MRE = {
  ...BASE_ITEM,
  kind: 'MRE',
  name: 'MRE',
  description: 'Military ration. Keeps you moving.',
  tags: ['item:consumable', 'food:meal'],
  weight: 1,
  value: 25,
  durabilityMax: 1,
};

const ITEM_DRINK_WATER = {
  ...BASE_ITEM,
  kind: 'WATER_BOTTLE',
  name: 'Water Bottle',
  description: 'Drink it. Or hoard it like a rat.',
  tags: ['item:consumable', 'drink:water'],
  weight: 1,
  value: 10,
  durabilityMax: 1,
};

const ITEM_DRINK_SODA = {
  ...BASE_ITEM,
  kind: 'SODA_CAN',
  name: 'Soda Can',
  description: 'Sugar + caffeine. Not hydration. Still nice.',
  tags: ['item:consumable', 'drink:soda'],
  weight: 1,
  value: 8,
  durabilityMax: 1,
};

// ------------------------------
// Tools / parts (no SCRAP / NAILS / METAL_BAR / GENERATOR_PARTS)
// ------------------------------

const ITEM_TOOL_TOOLKIT = {
  ...BASE_ITEM,
  kind: 'TOOLKIT',
  name: 'Toolkit',
  description: 'Fixer workhorse. Repairs and installs.',
  tags: ['item:tool', 'repair:yes'],
  weight: 3,
  value: 70,
  durabilityMax: 80,
};

const ITEM_PART_FUSE_KIT = {
  ...BASE_ITEM,
  kind: 'FUSE_KIT',
  name: 'Fuse Kit',
  description: 'Replacement fuses. Repair power in a room.',
  tags: ['item:part', 'infra:fuse'],
  weight: 1,
  value: 35,
  durabilityMax: 1,
};

const ITEM_PART_PIPE_PATCH = {
  ...BASE_ITEM,
  kind: 'PIPE_PATCH',
  name: 'Pipe Patch',
  description: 'Sealant + clamp. Repairs water in a room.',
  tags: ['item:part', 'infra:water'],
  weight: 1,
  value: 35,
  durabilityMax: 1,
};

const ITEM_FUEL_CAN = {
  ...BASE_ITEM,
  kind: 'FUEL_CAN',
  name: 'Fuel Can',
  description: 'Fuel for generators (when fuel exists).',
  tags: ['item:consumable', 'fuel'],
  weight: 4,
  value: 45,
  durabilityMax: 1,
};

// Battery (phones + later devices)
const ITEM_BATTERY = STACK(
  {
    ...BASE_ITEM,
    kind: 'BATTERY',
    name: 'Battery',
    description: 'Power cell. Phones love it.',
    tags: ['item:consumable', 'power:battery'],
  },
  { stackMax: 12, weight: 1, value: 12 }
);

// ------------------------------
// Deployables
// ------------------------------

const ITEM_GEAR_PORTABLE_GENERATOR = {
  ...BASE_ITEM,
  kind: 'GENERATOR_PORTABLE',
  name: 'Portable Generator',
  description: 'Install it to power a room (or a base). Loud.',
  tags: ['item:deployable', 'power'],
  weight: 18,
  value: 300,
  durabilityMax: 400,

  powerOutput: 3,
  fuelCap: 20,
  fuel: 0,
  fuelPerTick: 1,
  installableTo: ['SAFEHOUSE', 'OUTPOST'],
};

// ------------------------------
// Containers (inventory expanders)
// ------------------------------

const ITEM_CONTAINER_BACKPACK = {
  ...BASE_ITEM,
  kind: 'BACKPACK',
  name: 'Backpack',
  description: 'More carry capacity. Don’t lose it.',
  tags: ['item:container', 'equip:backpack'],

  slot: 'back',
  slotKey: 'backpack',
  layer: null,

  carryBonus: 12,
  weight: 2,
  value: 60,
  durabilityMax: 140,
};

const ITEM_CONTAINER_SHOPPING_CART = {
  ...BASE_ITEM,
  kind: 'SHOPPING_CART',
  name: 'Shopping Cart',
  description: 'Huge carry bonus. Also loud and clumsy.',
  tags: ['item:container', 'equip:cart'],

  slot: 'cart',
  slotKey: 'cart',
  layer: null,

  carryBonus: 35,
  weight: 12,
  value: 80,
  durabilityMax: 220,

  loudness: 1,
};

// ------------------------------
// Ammo (stackables)
// ------------------------------

const ITEM_AMMO_9MM = STACK(
  {
    ...BASE_ITEM,
    kind: 'AMMO_9MM',
    name: '9mm Ammo',
    description: 'For pistols.',
    tags: ['item:ammo', 'ammo:9MM'],
  },
  { stackMax: 30, weight: 1, value: 2 }
);

const ITEM_AMMO_SHELL = STACK(
  {
    ...BASE_ITEM,
    kind: 'AMMO_SHELL',
    name: 'Shotgun Shells',
    description: 'For shotguns.',
    tags: ['item:ammo', 'ammo:SHELL'],
  },
  { stackMax: 20, weight: 1, value: 3 }
);

const ITEM_AMMO_556 = STACK(
  {
    ...BASE_ITEM,
    kind: 'AMMO_556',
    name: '5.56 Ammo',
    description: 'For rifles.',
    tags: ['item:ammo', 'ammo:556'],
  },
  { stackMax: 25, weight: 1, value: 3 }
);

const ITEM_BOLT = STACK(
  {
    ...BASE_ITEM,
    kind: 'BOLT',
    name: 'Crossbow Bolts',
    description: 'For crossbows.',
    tags: ['item:ammo', 'ammo:BOLT'],
  },
  { stackMax: 15, weight: 1, value: 2 }
);

module.exports = {
  ITEM_MED_MEDKIT,
  ITEM_MED_BANDAGE,
  ITEM_MED_ANTISEPTIC,
  ITEM_MED_PAINKILLER,
  ITEM_MED_STIM,
  ITEM_MED_GHOST_DOSE,
  ITEM_MED_FOCUS_DOSE,
  ITEM_MED_FURY_DOSE,

  ITEM_DRINK_WATER,
  ITEM_DRINK_SODA,
  ITEM_FOOD_CANNED,
  ITEM_FOOD_MRE,

  ITEM_TOOL_TOOLKIT,
  ITEM_PART_FUSE_KIT,
  ITEM_PART_PIPE_PATCH,
  ITEM_FUEL_CAN,
  ITEM_BATTERY,

  ITEM_GEAR_PORTABLE_GENERATOR,

  ITEM_CONTAINER_BACKPACK,
  ITEM_CONTAINER_SHOPPING_CART,

  ITEM_AMMO_9MM,
  ITEM_AMMO_SHELL,
  ITEM_AMMO_556,
  ITEM_BOLT,
};