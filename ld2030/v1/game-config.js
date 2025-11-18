// ld2030/v1/game-config.js
// Centralized constants for Lockdown 2030 backend

// --- Tiles (used by map-gen and gameplay logic) ---
// Tiles represent terrain / movement, not specific building types.
// Buildings (HOUSE, SHOP, LAB, etc.) sit on top of GROUND tiles.
const TILES = {
  GROUND:  '0', // default walkable land (where buildings live)
  ROAD:    '1', // walkable, cheaper AP
  WATER:   '2', // swim / high AP cost or blocked for some units
  BLOCKED: '3', // cliffs, walls, ruins: not walkable
};

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

    // Faction-flavored locations / bases
    'SAFEHOUSE', 'SAFEHOUSE',                             // weight 2
    'OUTPOST',                                            // weight 1
    'BUNKER',                                             // weight 1
    'HQ',                                                 // generic faction HQ, weight 1
  ],

  // Map building types to colors
  BUILDING_PALETTE: {
    // Common civilian buildings
    HOUSE: '#F97316',        // orange-ish
    APARTMENT: '#4B5563',    // dark gray
    SHOP: '#FACC15',         // yellow
    RESTAURANT: '#EF4444',   // red
    OFFICE: '#6B7280',       // slate gray
    WAREHOUSE: '#92400E',    // brown
    PARKING: '#9CA3AF',      // light gray

    // Services / public buildings
    CLINIC: '#A855F7',       // purple
    HOSPITAL: '#EC4899',     // pink
    PHARMACY: '#22C55E',     // green
    SCHOOL: '#0EA5E9',       // cyan
    POLICE: '#3B82F6',       // blue
    FIRE_STATION: '#DC2626', // bright red
    GAS_STATION: '#F97316',  // reuse orange

    // Faction / special locations
    SAFEHOUSE: '#22C55E',    // emerald
    OUTPOST: '#F59E0B',      // amber
    BUNKER: '#4B5563',       // dark gray
    HQ: '#7C3AED',           // indigo/violet
  },

  // Tiles treated as "natural" / non-urban for simple heuristics.
  NATURAL_TILES: ['WATER'],

  // Tiles where we never spawn players directly (can refine later with building rules).
  SPAWN_AVOID: ['WATER', 'BLOCKED'],
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
  TILES,
};