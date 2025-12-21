// ld2030/v1/config/config-game.js
// Core high-level game config: grid, map, player defaults, zombie density, districts.

//
// GRID size presets
//
const GRID = {
  DEFAULT_W: 12,
  DEFAULT_H: 12,

  MIN_W: 4,
  MIN_H: 4,
  MAX_W: 64,
  MAX_H: 64,

  // If true, init-game can pick a random preset instead of DEFAULT_W/H
  USE_RANDOM: false,

  // Simple size picker (used only when USE_RANDOM === true)
  randomSize() {
    const presets = [
      { w: 12, h: 12 },
      { w: 16, h: 16 },
      { w: 20, h: 20 },
    ];
    const idx = Math.floor(Math.random() * presets.length);
    return presets[idx];
  },
};

//
// MAP settings (used by map-gen + city-layout)
//
const MAP = {
  DEFAULT_ID: 'world-1',

  // Used by city-layout / map-gen
  DEFAULT_BUILDING_CHANCE: 0.18,
  DEFAULT_MIN_LAB_DISTANCE: 6,
  CITY_STYLE: 'HYBRID',

  // NOTE:
  // BUILDING_TYPES are the *base* types the generator is allowed to pick.
  // Upgrades (APARTMENT/CLINIC/HOSPITAL/HOTEL/UNIVERSITY) are produced by floors rules.
  BUILDING_TYPES: [
    // Base types
    'HOUSE',
    'SHOP',
    'BAR',
    'RESTAURANT',
    'OFFICE',
    'WAREHOUSE',
    'PARKING',

    'SCHOOL',
    'PHARMACY',
    'POLICE',
    'FIRE_STATION',
    'GAS_STATION',
    'CHURCH',
    'MOTEL',

    // Strategic / special
    'SAFEHOUSE',
    'OUTPOST',
    'BUNKER',
    'HQ',
    'ISP',
    'LABORATORY',
    'TRANSFORMER_SUBSTATION',
    'WATER_PLANT',
  ],

  // Simple color palette for buildings (sent to clients via mapMeta.buildingPalette)
  // Palette MUST include upgrade-result types too, even if generator never picks them directly.
  BUILDING_PALETTE: {
    HOUSE: '#f4e3c1',
    APARTMENT: '#d9c5ff',

    SHOP: '#ffd27f',
    BAR: '#ffcf99',
    RESTAURANT: '#ffb3a7',

    OFFICE: '#c0e4ff',
    WAREHOUSE: '#c2c2c2',
    PARKING: '#dddddd',

    SCHOOL: '#ffe89a',
    UNIVERSITY: '#ffe0a3',

    PHARMACY: '#e0ffe8',
    CLINIC: '#ffe8f0',
    HOSPITAL: '#ffe0e0',

    POLICE: '#c0d8ff',
    FIRE_STATION: '#ffb3b3',
    GAS_STATION: '#fff0b3',

    CHURCH: '#e8d7ff',

    MOTEL: '#c9f2ff',
    HOTEL: '#bfe6ff',

    SAFEHOUSE: '#e6ffb3',
    OUTPOST: '#f0d0ff',
    BUNKER: '#b0b0b0',
    HQ: '#d0fff6',
    ISP: '#f6d0ff',

    LABORATORY: '#B3E5FF',
    TRANSFORMER_SUBSTATION: '#FFD6A5',
    WATER_PLANT: '#B3FFD9',
  },
};

//
// DISTRICTS (strategic layer)
//
const DISTRICTS = {
  ENABLED: true,

  // Kept for future (client can read it), but district assignment is done by districtForPos().
  MODE: 'TILES',

  // Rule: ~1 district per 64 tiles (rounded), clamped to [1..9].
  countForGrid({ w, h }) {
    const W = Math.max(1, Number(w) || 1);
    const H = Math.max(1, Number(h) || 1);
    const area = W * H;

    let c = Math.round(area / 64);
    if (!Number.isFinite(c)) c = 1;
    c = Math.max(1, Math.min(9, c));
    return c;
  },

  // Deterministic district id for a tile, splitting into 2x2 (4) or 3x3 (9) when possible.
  // Otherwise falls back to simple modulo.
  districtForPos({ x, y, w, h, count }) {
    const W = Math.max(1, Number(w) || 1);
    const H = Math.max(1, Number(h) || 1);
    const X = Math.min(Math.max(Number(x) || 0, 0), W - 1);
    const Y = Math.min(Math.max(Number(y) || 0, 0), H - 1);

    const c = Math.max(1, Number(count) || 1);
    if (c === 1) return 0;

    if (c === 4) {
      const left = X < W / 2;
      const top = Y < H / 2;
      // 0 1
      // 2 3
      if (top && left) return 0;
      if (top && !left) return 1;
      if (!top && left) return 2;
      return 3;
    }

    if (c === 9) {
      const col = Math.min(2, Math.floor((X / W) * 3));
      const row = Math.min(2, Math.floor((Y / H) * 3));
      return row * 3 + col;
    }

    return (Math.floor(X + Y * W) % c);
  },

  // Generator *may* try to place these per district later; not enforced today.
  REQUIRED_PER_DISTRICT: [
    { type: 'TRANSFORMER_SUBSTATION', count: 1 },
    { type: 'POLICE', count: 1 },
    { type: 'SCHOOL', count: 1 },
    { type: 'LABORATORY', count: 1 },
    { type: 'FIRE_STATION', count: 1 },
    { type: 'PHARMACY', count: 1 }, // floors can promote to CLINIC/HOSPITAL
    { type: 'ISP', count: 1 },
    { type: 'WATER_PLANT', count: 1 },
  ],

  MIN_DISTRICT_TILES: 16,
};

//
// PLAYER defaults (used by join-game)
//
const PLAYER = {
  START_HP: 100,
  START_AP: 3,
};

//
// ZOMBIE spawn density (used by state-spawn.js)
//
const ZOMBIE = {
  DENSITY: 0.04, // ~4% of tiles
  MIN: 10,
  MAX: 400,
};

module.exports = {
  GRID,
  MAP,
  PLAYER,
  ZOMBIE,
  DISTRICTS,
};