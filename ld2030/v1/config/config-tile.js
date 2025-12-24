// Centralized tile (terrain) definitions for Lockdown 2030 backend.

const TILES = {
  ROAD:     '0',
  BUILD:    '1',
  CEMETERY: '2',
  PARK:     '3',
  FOREST:   '4',
  WATER:    '5',
};

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
    moveCost: 1,
  },

  [TILES.BUILD]: {
    key: 'BUILD',
    label: 'Building base',
    colorHex: '#6B7280',
    blocksMovement: false,
    blocksVision: false,
    playerSpawnAllowed: true,
    zombieSpawnAllowed: true,
    natural: false,
    moveCost: 1,
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
    moveCost: 1,
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
    moveCost: 1,
  },

  [TILES.FOREST]: {
    key: 'FOREST',
    label: 'Forest',
    colorHex: '#166534',
    blocksMovement: false,
    blocksVision: true,
    playerSpawnAllowed: true,
    zombieSpawnAllowed: true,
    natural: true,
    moveCost: 2,
  },

  [TILES.WATER]: {
    key: 'WATER',
    label: 'Water',
    colorHex: '#0EA5E9',
    blocksMovement: false,   // swim allowed (V1)
    blocksVision: false,
    playerSpawnAllowed: false,
    zombieSpawnAllowed: false,
    natural: true,
    moveCost: 3,
  },
};

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