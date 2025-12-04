// ld2030/v1/config/config-game.js
// Grid, map generation & player constants for Lockdown 2030 backend

// --- Grid settings ---
const GRID = {
  // Hard bounds the backend will accept
  MIN_W: 8,
  MIN_H: 8,
  MAX_W: 64,
  MAX_H: 64,

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
    'SHOP', 'SHOP', 'SHOP', 'SHOP',                       // replaces MALL, weight 4
    'RESTAURANT', 'RESTAURANT', 'RESTAURANT',             // weight 3
    'OFFICE', 'OFFICE',                                   // weight 2
    'WAREHOUSE', 'WAREHOUSE',                             // weight 2
    'PARKING',                                            // weight 1

    // Services / public buildings
    'CLINIC', 'CLINIC',                                   // weight 2
    'HOSPITAL',                                           // weight 1
    'PHARMACY',                                           // weight 1
    'SCHOOL', 'SCHOOL',                                   // weight 2
    'POLICE', 'POLICE',                                   // keep police, weight 2
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
    HOUSE:      '#f9ad16ff', // orange-ish
    APARTMENT:  '#e08225ff', // lime green
    SHOP:       '#ebd270ff', // yellow
    RESTAURANT: '#a4b453ff', // red
    OFFICE:     '#c663f1ff', // indigo
    WAREHOUSE:  '#52250aff', // brown
    PARKING:    '#aaa7a041', // amber

    // Services / public buildings
    CLINIC:        '#dc55f7ff', // purple
    HOSPITAL:      '#EC4899', // pink
    PHARMACY:      '#440d4cff', // green
    SCHOOL:        '#4ed0d0ff', // cyan
    POLICE:        '#3B82F6', // blue
    FIRE_STATION:  '#DC2626', // bright red
    GAS_STATION:   '#552808ff', // reuse orange
    RADIO_STATION: '#71fbd2ff', // rose

    // Faction / special locations
    SAFEHOUSE: '#22C55E', // emerald
    OUTPOST:   '#F59E0B', // amber
    BUNKER:    '#4C1D95', // dark violet
    HQ:        '#7C3AED', // indigo/violet
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

// --- Player parameters ---
const PLAYER = {
  START_HP: 100,
  START_AP: 3,
  MOVE_AP_COST: 1,
  ATTACK_AP_COST: 1,
  ATTACK_DAMAGE: 10,
};

// --- Export everything ---
module.exports = {
  GRID,
  MAP,
  PLAYER,
};