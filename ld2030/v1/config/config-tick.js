// ld2030/v1/config/config-tick.js
// Centralised tick-related tuning for Lockdown2030.
// Pure data: no requires, just knobs.

module.exports = {
  // How often the main game tick should run, in milliseconds.
  TICK_INTERVAL_MS: 60 * 1000, // 60s

  // ------------------------
  // Player AP / HP regeneration
  // ------------------------
  PLAYER: {
    // How many AP a player regains per tick.
    AP_REGEN_PER_TICK: 1,
    // Hard cap on AP so they can’t stockpile forever.
    // Set to 3 to match your current START_AP.
    MAX_AP: 3,
    // Optional future knobs:
    // HP_REGEN_PER_TICK: 0,
  },

  // ------------------------
  // Zombies
  // ------------------------
  ZOMBIE: {
    // How many tiles a zombie is allowed to move per tick.
    MAX_MOVES_PER_TICK: 1,
    // Radius (in tiles) within which zombies start caring about a player.
    AGGRO_RADIUS: 4,
    // Max wander distance for idle zombies if you later add that logic.
    WANDER_RADIUS: 6,
  },
};