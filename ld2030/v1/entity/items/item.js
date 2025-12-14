// ld2030/v1/entity/items/item.js

const { BASE_ITEM } = require('../base-item');

// 5 requested + generator (world-heavy)


const ITEM_MED_MEDKIT = {
  ...BASE_ITEM,
  kind: 'MEDKIT',
  name: 'Medkit',
  tags: ['item:consumable', 'heal:big'],

  weight: 2,
  value: 90,
  durabilityMax: 1,
};

const ITEM_FOOD_MRE = {
  ...BASE_ITEM,
  kind: 'MRE',
  name: 'MRE',
  tags: ['item:consumable', 'food:meal'],

  weight: 1,
  value: 25,
  durabilityMax: 1,
};

const ITEM_TOOL_TOOLKIT = {
  ...BASE_ITEM,
  kind: 'TOOLKIT',
  name: 'Toolkit',
  tags: ['item:tool', 'repair:yes'],

  slot: 'tool',
  weight: 3,
  value: 70,
  durabilityMax: 80,
};

const ITEM_GEAR_PORTABLE_GENERATOR = {
  ...BASE_ITEM,
  kind: 'GENERATOR_PORTABLE',
  name: 'Portable Generator',
  tags: ['item:gear', 'deployable', 'power'],

  // carried item
  slot: 'gear',
  weight: 18,
  value: 300,
  durabilityMax: 400,

  // generator-specific fields (engine/building install uses these)
  powerOutput: 3,          // abstract power units
  fuelCap: 20,             // max fuel units
  fuel: 0,                 // current fuel units (spawner can override)
  fuelPerTick: 1,          // consumption rate when running
  installableTo: ['SAFEHOUSE', 'OUTPOST'],
};
const ITEM_TOOL_LOCKPICK = {
  ...BASE_ITEM,
  kind: 'LOCKPICK',
  name: 'Lockpick',
  tags: ['item:tool', 'lockpick:yes'],

  slot: 'tool',
  weight: 1,
  value: 40,
  durabilityMax: 30,

  // tool-specific fields (engine can interpret)
  usesMax: 30,
};

module.exports = {
  ITEM_MED_MEDKIT,
  ITEM_FOOD_MRE,
  ITEM_TOOL_TOOLKIT,
  ITEM_TOOL_LOCKPICK,
  ITEM_GEAR_PORTABLE_GENERATOR,
};