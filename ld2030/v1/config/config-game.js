// ld2030/v1/config/config-game.js
// Core high-level game config: grid, map, player defaults, zombie density.

//
// GRID size presets
//
const GRID = {
  DEFAULT_W: 12,
  DEFAULT_H: 12,

  MIN_W: 4,
  MIN_H: 4,
  MAX_W: 64,
  MAX_H: 64,

  // If true, init-game can pick a random preset instead of DEFAULT_W/H
  USE_RANDOM: false,

  // Simple size picker (used only when USE_RANDOM === true)
  randomSize() {
    const presets = [
      { w: 12, h: 12 },
      { w: 16, h: 16 },
      { w: 20, h: 20 },
    ];
    const idx = Math.floor(Math.random() * presets.length);
    return presets[idx];
  },
};

//
// MAP settings (used by map-gen + city-layout)
//
const MAP = {
  DEFAULT_ID: 'world-1',

  // Used by city-layout / map-gen
  DEFAULT_BUILDING_CHANCE: 0.18,
  DEFAULT_MIN_LAB_DISTANCE: 6,
  CITY_STYLE: 'HYBRID',

  // High-level building labels (used by map-buildings.js)
  BUILDING_TYPES: [
    'HOUSE',
    'APARTMENT',
    'SHOP',
    'RESTAURANT',
    'OFFICE',
    'WAREHOUSE',
    'PARKING',
    'SCHOOL',
    'HOSPITAL',
    'CLINIC',
    'PHARMACY',
    'POLICE',
    'FIRE_STATION',
    'GAS_STATION',
    'SAFEHOUSE',
    'OUTPOST',
    'BUNKER',
    'HQ',
    'RADIO_STATION',
  ],

  // Simple color palette for buildings (sent to clients via mapMeta.buildingPalette)
  BUILDING_PALETTE: {
    HOUSE: '#f4e3c1',
    APARTMENT: '#d9c5ff',
    SHOP: '#ffd27f',
    RESTAURANT: '#ffb3a7',
    OFFICE: '#c0e4ff',
    WAREHOUSE: '#c2c2c2',
    PARKING: '#dddddd',

    SCHOOL: '#ffe89a',
    HOSPITAL: '#ffe0e0',
    CLINIC: '#ffe8f0',
    PHARMACY: '#e0ffe8',
    POLICE: '#c0d8ff',
    FIRE_STATION: '#ffb3b3',
    GAS_STATION: '#fff0b3',

    SAFEHOUSE: '#e6ffb3',
    OUTPOST: '#f0d0ff',
    BUNKER: '#b0b0b0',
    HQ: '#d0fff6',
    RADIO_STATION: '#f6d0ff',
  },
};

//
// PLAYER defaults (used by join-game)
//
const PLAYER = {
  START_HP: 100,
  START_AP: 3,
};

//
// ZOMBIE spawn density (used by state-spawn.js)
//
const ZOMBIE = {
  DENSITY: 0.04, // ~4% of tiles
  MIN: 10,
  MAX: 400,
};

module.exports = {
  GRID,
  MAP,
  PLAYER,
  ZOMBIE,
};