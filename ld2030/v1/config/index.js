// ld2030/v1/config/index.js
// Single entry point for all game config.

const {
  TILES,
  TILE_META,
  NATURAL_TILE_KEYS,
  SPAWN_AVOID_TILE_CODES,
} = require('../config-tile');          // ← note the ".." here yes
const { GRID, MAP, PLAYER } = require('./config-game');
const TICK = require('./config-tick');

module.exports = {
  // Tiles
  TILES,
  TILE_META,
  NATURAL_TILE_KEYS,
  SPAWN_AVOID_TILE_CODES,

  // Game-level config
  GRID,
  MAP,
  PLAYER,

  // Tick / turn config (AP regen, zombie pacing, etc.)
  TICK,
};