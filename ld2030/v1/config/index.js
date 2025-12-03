// ld2030/v1/config/index.js
// Single entry point for all game config.


const { TILES, TILE_META } = require('./config-tiles');
const { GRID, MAP, PLAYER } = require('./config-game');

// Tick-related defaults (AP regen, zombie pacing, etc.)
const TICK = {
  PLAYER: {
    // How much AP a player regains each tick.
    AP_REGEN_PER_TICK: 1,
    // Upper bound for AP. If PLAYER exposes MAX_AP, prefer that; otherwise fall back.
    MAX_AP: (PLAYER && (PLAYER.MAX_AP || PLAYER.START_AP)) || 3,
  },
  ZOMBIE: {
    // How many tiles a zombie is allowed to move per tick.
    MAX_MOVES_PER_TICK: 1,
    // Future knobs: attack chance, preferred distance, etc.
  },
};

module.exports = {
  // Tiles
  TILES,
  TILE_META,

  // Game-level config
  GRID,
  MAP,
  PLAYER,

  // Tick / turn config (AP regen, zombie pacing, etc.)
  TICK,
};