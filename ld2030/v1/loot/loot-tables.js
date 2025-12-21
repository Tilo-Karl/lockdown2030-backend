// ld2030/v1/loot/loot-tables.js
// v1 loot tables for SEARCH. Keep it small, useful, and consistent.

const { getItem } = require('../entity/items/catalog');

// helper: [kind, weight]
const W = (kind, weight) => [kind, weight];

// IMPORTANT: keys must match config-game.js MAP.BUILDING_TYPES exactly.
const LOOT_TABLES = {
  HOUSE: [
    W('WATER_BOTTLE', 18),
    W('SODA_CAN', 14),
    W('CANNED_FOOD', 16),
    W('MRE', 12),
    W('BATTERY', 10),
    W('BANDAGE', 8),
    W('ANTISEPTIC', 6),
    W('KNIFE', 6),
    W('BASEBALL_BAT', 6),
    W('BACKPACK', 4),
    W('PAINKILLER', 3),
    W('MEDKIT', 2),
  ],

  SHOP: [
    W('WATER_BOTTLE', 16),
    W('SODA_CAN', 16),
    W('CANNED_FOOD', 14),
    W('MRE', 10),
    W('BATTERY', 12),
    W('BACKPACK', 8),
    W('SHOPPING_CART', 3),
    W('BANDAGE', 6),
    W('ANTISEPTIC', 4),
    W('TOOLKIT', 5),
    W('PIPE_PATCH', 3),
    W('FUSE_KIT', 3),
    W('PAINKILLER', 3),
    W('MEDKIT', 2),
  ],

  BAR: [
    W('SODA_CAN', 18),
    W('WATER_BOTTLE', 10),
    W('CANNED_FOOD', 8),
    W('BASEBALL_BAT', 16),
    W('PIPE', 14),
    W('AMMO_9MM', 10),
    W('PISTOL', 5),
    W('PAINKILLER', 3),
    W('BANDAGE', 2),
    W('MEDKIT', 2),
  ],

  RESTAURANT: [
    W('WATER_BOTTLE', 18),
    W('SODA_CAN', 18),
    W('CANNED_FOOD', 18),
    W('MRE', 16),
    W('KNIFE', 8),
    W('BANDAGE', 6),
    W('ANTISEPTIC', 4),
    W('PAINKILLER', 4),
    W('MEDKIT', 2),
  ],

  OFFICE: [
    W('BATTERY', 18),
    W('WATER_BOTTLE', 12),
    W('SODA_CAN', 12),
    W('CANNED_FOOD', 10),
    W('MRE', 10),
    W('BACKPACK', 6),
    W('BANDAGE', 6),
    W('PAINKILLER', 4),
    W('HOODIE', 6),
    W('MEDKIT', 2),
  ],

  WAREHOUSE: [
    W('TOOLKIT', 18),
    W('BATTERY', 14),
    W('FUSE_KIT', 10),
    W('PIPE_PATCH', 10),
    W('PIPE', 10),
    W('MACHETE', 6),
    W('GENERATOR_PORTABLE', 5),
    W('FUEL_CAN', 8),
    W('WATER_BOTTLE', 8),
    W('CANNED_FOOD', 6),
    W('MRE', 6),
    W('WORK_GLOVES', 8),
    W('HELMET', 5),
  ],

  PARKING: [
    W('BATTERY', 18),
    W('WATER_BOTTLE', 10),
    W('SODA_CAN', 10),
    W('CANNED_FOOD', 8),
    W('PIPE', 10),
    W('TOOLKIT', 6),
    W('BOOTS', 8),
    W('MOTO_JACKET', 6),
  ],

  SCHOOL: [
    W('BACKPACK', 16),
    W('BATTERY', 14),
    W('WATER_BOTTLE', 10),
    W('SODA_CAN', 10),
    W('CANNED_FOOD', 8),
    W('MRE', 8),
    W('BASEBALL_BAT', 10),
    W('HOODIE', 10),
    W('BANDAGE', 4),
  ],

  PHARMACY: [
    W('MEDKIT', 16),
    W('BANDAGE', 14),
    W('ANTISEPTIC', 14),
    W('PAINKILLER', 12),
    W('STIM', 6),
    W('WATER_BOTTLE', 10),
    W('SODA_CAN', 6),
    W('CANNED_FOOD', 6),
    W('MRE', 6),
    W('BATTERY', 8),
    W('TOOLKIT', 2),
    W('GHOST_DOSE', 2),
  ],

  POLICE: [
    W('PISTOL', 10),
    W('SHOTGUN', 6),
    W('RIFLE', 4),
    W('AMMO_9MM', 18),
    W('AMMO_SHELL', 12),
    W('AMMO_556', 10),
    W('BULLETPROOF_VEST', 8),
    W('HELMET', 10),
    W('MEDKIT', 6),
    W('BANDAGE', 6),
    W('ANTISEPTIC', 4),
    W('BATTERY', 8),
  ],

  FIRE_STATION: [
    W('MEDKIT', 10),
    W('BANDAGE', 10),
    W('ANTISEPTIC', 8),
    W('TOOLKIT', 14),
    W('BATTERY', 10),
    W('WATER_BOTTLE', 10),
    W('CANNED_FOOD', 6),
    W('PIPE', 10),
    W('MACHETE', 6),
    W('RIOT_VEST', 3),
    W('WORK_GLOVES', 10),
    W('HELMET', 6),
  ],

  GAS_STATION: [
    W('WATER_BOTTLE', 18),
    W('SODA_CAN', 18),
    W('CANNED_FOOD', 10),
    W('MRE', 10),
    W('BATTERY', 14),
    W('FUEL_CAN', 10),
    W('TOOLKIT', 6),
    W('PIPE_PATCH', 4),
    W('MEDKIT', 2),
  ],

  CHURCH: [
    W('WATER_BOTTLE', 14),
    W('SODA_CAN', 10),
    W('CANNED_FOOD', 10),
    W('MRE', 10),
    W('KNIFE', 10),
    W('BASEBALL_BAT', 8),
    W('BACKPACK', 6),
    W('DENIM_JACKET', 8),
    W('BANDAGE', 4),
    W('PAINKILLER', 3),
  ],

  MOTEL: [
    W('WATER_BOTTLE', 14),
    W('SODA_CAN', 14),
    W('CANNED_FOOD', 10),
    W('MRE', 12),
    W('BACKPACK', 8),
    W('BANDAGE', 6),
    W('PAINKILLER', 4),
    W('MEDKIT', 3),
    W('MOTO_JACKET', 6),
    W('BOOTS', 10),
  ],

  SAFEHOUSE: [
    W('TOOLKIT', 14),
    W('FUSE_KIT', 8),
    W('PIPE_PATCH', 8),
    W('MEDKIT', 10),
    W('BANDAGE', 10),
    W('ANTISEPTIC', 8),
    W('WATER_BOTTLE', 12),
    W('CANNED_FOOD', 10),
    W('MRE', 10),
    W('BATTERY', 10),
    W('BACKPACK', 6),
    W('PIPE', 4),
    W('HELMET', 4),
  ],

  OUTPOST: [
    W('TOOLKIT', 12),
    W('FUSE_KIT', 8),
    W('PIPE_PATCH', 8),
    W('MEDKIT', 8),
    W('BANDAGE', 8),
    W('WATER_BOTTLE', 10),
    W('CANNED_FOOD', 8),
    W('MRE', 8),
    W('BATTERY', 10),
    W('AMMO_9MM', 12),
    W('AMMO_556', 10),
    W('PISTOL', 6),
    W('RIFLE', 4),
    W('BULLETPROOF_VEST', 6),
    W('HELMET', 6),
  ],

  BUNKER: [
    W('MEDKIT', 10),
    W('BANDAGE', 10),
    W('ANTISEPTIC', 8),
    W('BATTERY', 12),
    W('MRE', 16),
    W('WATER_BOTTLE', 14),
    W('CANNED_FOOD', 10),
    W('AMMO_556', 12),
    W('RIFLE', 6),
    W('HELMET', 6),
    W('RIOT_VEST', 4),
  ],

  HQ: [
    W('BATTERY', 14),
    W('MEDKIT', 8),
    W('BANDAGE', 8),
    W('ANTISEPTIC', 6),
    W('WATER_BOTTLE', 10),
    W('CANNED_FOOD', 10),
    W('MRE', 10),
    W('AMMO_9MM', 12),
    W('AMMO_556', 12),
    W('PISTOL', 6),
    W('RIFLE', 5),
    W('RIOT_VEST', 4),
    W('BULLETPROOF_VEST', 6),
    W('HELMET', 7),
  ],

  // Config key stays RADIO_STATION; gameplay name is ISP.
  RADIO_STATION: [
    W('BATTERY', 20),
    W('TOOLKIT', 12),
    W('FUSE_KIT', 10),
    W('PIPE_PATCH', 8),
    W('WATER_BOTTLE', 8),
    W('CANNED_FOOD', 6),
    W('MRE', 6),
    W('BACKPACK', 6),
    W('WORK_GLOVES', 6),
  ],

  LABORATORY: [
    W('MEDKIT', 12),
    W('BANDAGE', 12),
    W('ANTISEPTIC', 12),
    W('PAINKILLER', 10),
    W('STIM', 6),
    W('BATTERY', 14),
    W('WATER_BOTTLE', 8),
    W('MRE', 6),
    W('TOOLKIT', 8),
    W('FOCUS_DOSE', 2),
  ],

  TRANSFORMER_SUBSTATION: [
    W('BATTERY', 22),
    W('TOOLKIT', 18),
    W('FUSE_KIT', 16),
    W('PIPE', 10),
    W('WORK_GLOVES', 10),
    W('HELMET', 8),
    W('GENERATOR_PORTABLE', 3),
    W('WATER_BOTTLE', 6),
    W('CANNED_FOOD', 4),
  ],
  
};

// Aliases for promoted building types (safe default tables)
LOOT_TABLES.APARTMENT = LOOT_TABLES.HOUSE;
LOOT_TABLES.HOTEL = LOOT_TABLES.MOTEL;
LOOT_TABLES.UNIVERSITY = LOOT_TABLES.SCHOOL;
LOOT_TABLES.CLINIC = LOOT_TABLES.PHARMACY;
LOOT_TABLES.HOSPITAL = LOOT_TABLES.LABORATORY; // swap later if you want a richer hospital table

function getWeightedLoot(buildingType) {
  const rows = LOOT_TABLES[buildingType] || [];
  return rows.map(([kind, weight]) => ({ item: getItem(kind), weight }));
}

module.exports = {
  LOOT_TABLES,
  getWeightedLoot,
};