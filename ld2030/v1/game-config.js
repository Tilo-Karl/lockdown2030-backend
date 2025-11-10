// ld2030/v1/game-config.js
// Centralized constants for Lockdown 2030 backend

// --- Tiles (used by map-gen and gameplay logic) ---
const TILES = {
  EMPTY: '0',
  ROAD: '1',
  BUILD: '2',
  LAB: '3',
  RESTAURANT: '4',
  POLICE: '5',
  MALL: '6',
  PARK: '7',
  WATER: '8',
};

// --- Grid settings ---
const GRID = {
  DEFAULT_W: 12,
  DEFAULT_H: 12,
  PRESETS: [
    { w: 12, h: 12 },
    { w: 16, h: 16 },
    { w: 24, h: 24 },
    { w: 32, h: 32 },
  ],

  /** Pick a random grid preset */
  randomSize() {
    const pick = this.PRESETS[Math.floor(Math.random() * this.PRESETS.length)];
    return { w: pick.w, h: pick.h };
  },
};

// --- Map generation parameters ---
const MAP = {
  DEFAULT_BUILDING_CHANCE: 0.18,
  DEFAULT_MIN_LAB_DISTANCE: 6,
  BUILDING_TYPES: ['BUILD', 'RESTAURANT', 'POLICE', 'MALL'],
  NATURAL_TILES: ['PARK', 'WATER'],
  SPAWN_AVOID: ['BUILD', 'LAB', 'WATER'],
};

// --- Player parameters ---
const PLAYER = {
  START_HP: 100,
  START_AP: 3,
  MOVE_AP_COST: 1,
  ATTACK_AP_COST: 1,
  ATTACK_DAMAGE: 10,
};

// --- Export everything ---
module.exports = {
  GRID,
  MAP,
  PLAYER,
  TILES,
};