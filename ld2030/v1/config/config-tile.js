// ld2030/v1/config-tile.js
// Centralized tile (terrain) definitions for Lockdown 2030 backend.
//
// Tiles are the ground layer the map generator uses (roads, water, forest…).
// Buildings (HOUSE, SHOP, LAB, etc.) sit on top of BUILD tiles.

/**
 * Symbolic names → tile codes used in the terrain 2D array.
 * These codes are what map-gen writes and clients read.
 */
const TILES = {
  ROAD:     '0', // streets, cheap AP
  BUILD:    '1', // building footprints (where houses, shops, etc. live)
  CEMETERY: '2', // outdoor graveyard terrain
  PARK:     '3', // open green area, walkable
  FOREST:   '4', // dense area, maybe LOS penalty / slower
  WATER:    '5', // swim / high AP cost or blocked for some units
};

/**
 * Per-tile metadata keyed by tile code ("0", "1", …).
 * This is the single source of truth for labels, colors, and basic rules.
 *
 * You can safely add more fields later (moveCost, blocksVision, etc.)
 * without breaking existing code.
 */
const TILE_META = {
  [TILES.ROAD]: {
    key: 'ROAD',
    label: 'Road',
    colorHex: '#4B5563',
    blocksMovement: false,
    blocksVision: false,
    playerSpawnAllowed: true,
    zombieSpawnAllowed: true,
    natural: false,
  },

  [TILES.BUILD]: {
    key: 'BUILD',
    label: 'Building base',
    colorHex: '#6B7280',
    blocksMovement: false, // buildings themselves live on top of this
    blocksVision: false,
    playerSpawnAllowed: true,
    zombieSpawnAllowed: true,
    natural: false,
  },

  [TILES.CEMETERY]: {
    key: 'CEMETERY',
    label: 'Cemetery',
    colorHex: '#B45309',
    blocksMovement: false,
    blocksVision: false,
    playerSpawnAllowed: true,
    zombieSpawnAllowed: true,
    natural: true,
  },

  [TILES.PARK]: {
    key: 'PARK',
    label: 'Park',
    colorHex: '#86EFAC',
    blocksMovement: false,
    blocksVision: false,
    playerSpawnAllowed: true,
    zombieSpawnAllowed: true,
    natural: true,
  },

  [TILES.FOREST]: {
    key: 'FOREST',
    label: 'Forest',
    colorHex: '#166534',
    blocksMovement: false,   // movement rules can use this later
    blocksVision: true,      // LOS penalty knob for future
    playerSpawnAllowed: true,
    zombieSpawnAllowed: true,
    natural: true,
  },

  [TILES.WATER]: {
    key: 'WATER',
    label: 'Water',
    colorHex: '#0EA5E9',
    blocksMovement: true,    // future movement rules
    blocksVision: false,
    playerSpawnAllowed: false,
    zombieSpawnAllowed: false,
    natural: true,
  },
};

/**
 * Convenience lists derived from meta. These mirror what you had in MAP
 * (NATURAL_TILES / SPAWN_AVOID) but live next to the tile definitions.
 */
const NATURAL_TILE_KEYS = Object.values(TILES).filter((code) => {
  return TILE_META[code]?.natural;
});

const SPAWN_AVOID_TILE_CODES = Object.values(TILES).filter((code) => {
  const meta = TILE_META[code];
  return meta && (!meta.playerSpawnAllowed || !meta.zombieSpawnAllowed);
});

module.exports = {
  TILES,
  TILE_META,
  NATURAL_TILE_KEYS,
  SPAWN_AVOID_TILE_CODES,
};