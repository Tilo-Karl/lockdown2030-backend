// Stairs barricade config (edge between floors inside a building).
// Stairs themselves are never destroyed; only the barricade object is.

const STAIRS = {
  // Player actions
  BARRICADE_AP_COST: 1,
  DEBARRICADE_AP_COST: 1,

  // Build tuning
  MAX_BARRICADE_LEVEL: 5,

  // Barricade durability (only applies when level > 0)
  BASE_HP: 0,
  HP_PER_LEVEL: 12,
};

module.exports = { STAIRS };