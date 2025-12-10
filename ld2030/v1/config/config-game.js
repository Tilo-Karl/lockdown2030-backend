// ld2030/v1/config/config-game.js
// Grid, map generation & player constants for Lockdown 2030 backend

const { PLAYER } = require('../entity/config-entity');

// --- Grid settings ---
const GRID = {
  // Hard bounds the backend will accept
  MIN_W: 8,
  MIN_H: 8,
  MAX_W: 64,
  MAX_H: 64,

  // If true → init-game will use a random preset size instead of DEFAULT_W/DEFAULT_H
  USE_RANDOM: false,

  // Default size the init endpoint will use
  DEFAULT_W: 12,
  DEFAULT_H: 12,

  PRESETS: [
    { w: 12, h: 12 },
    { w: 16, h: 16 },
    { w: 24, h: 24 },
    { w: 32, h: 32 },
  ],

  /** Pick a random grid preset */
  randomSize() {
    const pick = this.PRESETS[Math.floor(Math.random() * this.PRESETS.length)];
    return { w: pick.w, h: pick.h };
  },
};

// --- Map generation parameters ---
const MAP = {
  DEFAULT_ID: 'world-1',
  DEFAULT_BUILDING_CHANCE: 0.18,
  DEFAULT_MIN_LAB_DISTANCE: 6,

  // Weighted list of building type labels
  BUILDING_TYPES: [
    // Common civilian buildings (more frequent)
    'HOUSE', 'HOUSE', 'HOUSE', 'HOUSE', 'HOUSE',          // weight 5
    'APARTMENT', 'APARTMENT', 'APARTMENT',                // weight 3
    'SHOP', 'SHOP', 'SHOP', 'SHOP',                       // weight 4
    'RESTAURANT', 'RESTAURANT',                           // weight 2
    'QUICK_FOOD',                                        // weight 1
    'OFFICE', 'OFFICE',                                   // weight 2
    'WAREHOUSE', 'WAREHOUSE',                             // weight 2
    'PARKING',                                            // weight 1

    // Services / public buildings
    'HOSPITAL',                                           // weight 1
    'PHARMACY',                                           // weight 1
    'SCHOOL', 'SCHOOL',                                   // weight 2
    'POLICE', 'POLICE',                                   // weight 2
    'FIRE_STATION',                                       // weight 1
    'GAS_STATION',                                        // weight 1
    'RADIO_STATION',                                      // weight 1

    // Faction-flavored locations / bases
    'SAFEHOUSE', 'SAFEHOUSE',                             // weight 2
    'OUTPOST',                                            // weight 1
    'BUNKER',                                             // weight 1
    'HQ',                                                 // generic faction HQ, weight 1
  ],

  // Map building types to colors
  BUILDING_PALETTE: {
    // Common civilian buildings
    SHOP:       '#F59E0B', // orange
    HOUSE:      '#EA580C', // darker orange
    APARTMENT:  '#C2410C', // darkest orange
    RESTAURANT: '#FACC15', // bright yellow
    QUICK_FOOD: '#EAB308', // deeper yellow / fast food
    OFFICE:     '#8B5CF6', // purple
    WAREHOUSE:  '#6D28D9', // darker purple
    PARKING:    '#E5E7EB', // light grey

    // Services / public buildings
    PHARMACY:      '#F9A8D4', // light pink
    HOSPITAL:      '#EC4899', // darker pink
    SCHOOL:        '#B91C1C', // darker red
    POLICE:        '#3B82F6', // bright blue
    FIRE_STATION:  '#EF4444', // bright red
    GAS_STATION:   '#F97316', // orange-red
    RADIO_STATION: '#22D3EE', // cyan

    // Faction / special locations
    SAFEHOUSE: '#A855F7', // bright purple
    OUTPOST:   '#7C3AED', // darker purple
    BUNKER:    '#6D28D9', // even darker purple
    HQ:        '#4C1D95', // darkest purple
  },

  // High-level district types for city layout
  DISTRICT_TYPES: [
    'DOWNTOWN',
    'RESIDENTIAL',
    'INDUSTRIAL',
    'SUBURB',
    'PARKLAND',
  ],

  // Per-district generation parameters (used by map-gen)
  DISTRICT_PARAMS: {
    DOWNTOWN: {
      buildingChance: 0.75,  // dense core
      forestChance: 0.02,
      waterChance: 0.02,
    },
    RESIDENTIAL: {
      buildingChance: 0.55,
      forestChance: 0.05,
      waterChance: 0.02,
    },
    INDUSTRIAL: {
      buildingChance: 0.6,
      forestChance: 0.01,
      waterChance: 0.02,
    },
    SUBURB: {
      buildingChance: 0.45,
      forestChance: 0.08,
      waterChance: 0.03,
    },
    PARKLAND: {
      buildingChance: 0.25,
      forestChance: 0.2,
      waterChance: 0.1,
    },
  },

  // Tiles treated as "natural" / non-urban for simple heuristics.
  NATURAL_TILES: ['WATER'],

  // Tiles where we never spawn players directly (can refine later with building rules).
  SPAWN_AVOID: ['WATER'],
};

// --- Zombie parameters ---
const ZOMBIE = {
  // Approximate fraction of tiles to use when spawning initial zombies
  DENSITY: 0.10, // 10% of all tiles

  // Hard lower/upper bounds so tiny or huge maps don’t go crazy
  MIN: 10,
  MAX: 150,
};

// --- Export everything ---
module.exports = {
  GRID,
  MAP,
  PLAYER,
  ZOMBIE,
};