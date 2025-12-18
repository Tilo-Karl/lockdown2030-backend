// ld2030/v1/config/config-doors.js
// Door tuning knobs (Quarantine-style). Keep gameplay constants here.

const DOOR = {
  // Player actions
  SECURE_AP_COST: 1,
  BARRICADE_AP_COST: 1,
  DEBARRICADE_AP_COST: 1,
  REPAIR_AP_COST: 2,

  // Climb actions (kept here so “doors + climb” stays one tuning surface)
  CLIMB_IN_AP_COST: 2,
  CLIMB_OUT_AP_COST: 1,

  // Barricade model
  MAX_BARRICADE_LEVEL: 5,

  // “Door health” model (mostly for zombies later)
  BASE_HP: 10,         // base resistance when intact
  SECURE_HP_BONUS: 5,  // “chair against door” stage
  HP_PER_LEVEL: 10,    // each barricade level adds HP
};

module.exports = { DOOR };