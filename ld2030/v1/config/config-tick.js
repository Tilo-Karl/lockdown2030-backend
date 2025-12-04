// ld2030/v1/config/config-tick.js
// Centralised tick-related tuning for Lockdown2030.
//
// Kept deliberately small and data-only so the tick engine can
// depend on this without pulling in any other modules.

module.exports = {
  // How often the main game tick should run, in milliseconds.
  // (Backend scheduler / client can choose to call less often, but
  // this is what the tick engine is tuned for.)
  TICK_INTERVAL_MS: 60 * 1000, // 60s

  // ------------------------
  // Player AP regeneration
  // ------------------------
  PLAYER_AP: {
    // How many AP a player regains per tick.
    AP_PER_TICK: 1,
    // Hard cap on AP so they can’t stockpile forever.
    MAX_AP: 4,
  },

  // ------------------------
  // Zombies
  // ------------------------
  ZOMBIE: {
    // How many tiles a zombie is allowed to move per tick.
    MAX_STEPS_PER_TICK: 1,
    // Radius (in tiles) within which zombies start caring about a player.
    AGGRO_RADIUS: 4,
    // Max wander distance for idle zombies if you later add that logic.
    WANDER_RADIUS: 6,
  },
};
