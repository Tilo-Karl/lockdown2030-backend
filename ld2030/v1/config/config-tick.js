// Centralised tick-related tuning for Lockdown2030.
// Pure data: no requires, just knobs.

module.exports = {
  // Scheduler cadence: contract tick length is 5 minutes.
  // (This is the interval your runner should call tickGame.)
  TICK_INTERVAL_MS: 5 * 60 * 1000, // 300s

  // V1 constants that tick modules read (values match contracts).
  METERS: {
    DRAIN_EVERY_TICKS: 72,              // 6 hours
    HYDRATION_REFRESH_EVERY_TICKS: 12,  // 1 hour (inside + water available)
    METER_MAX: 4,
    STRESS_MAX: 4,
  },

  PLAYER: {
    AP_REGEN_PER_TICK: 1,
    HP_REGEN_PER_TICK: 2,
    MAX_AP: 3,
    MAX_HP: 100,
  },

  // Zombies: keep keys that existing tick modules actually read.
  ZOMBIE: {
    ROAM: 1,
    STAIRS_CHANCE: 0.25,
  },
};