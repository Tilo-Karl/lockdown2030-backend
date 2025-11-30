// ld2030/v1/config/index.js
// Single entry point for all game config.

const { TILES, TILE_META } = require('./config-tiles');
const { GRID, MAP, PLAYER } = require('./config-game');

module.exports = {
  // Tiles
  TILES,
  TILE_META,

  // Game-level config
  GRID,
  MAP,
  PLAYER,
};