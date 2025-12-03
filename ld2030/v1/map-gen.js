// ld2030/v1/map-gen.js
// Pure, deterministic map generator (no Firebase/Express).

// Shared game config (tile codes, passability, etc.)
const { TILES, MAP, NATURAL_TILE_KEYS, SPAWN_AVOID_TILE_CODES } = require('./config');
const { extractBuildings } = require('./map-buildings');
const { generateCityLayout } = require('./city-layout');

// Tiny seeded PRNG
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Passability helpers
function isPassableChar(ch) {
  // Delegate to config-driven list of passable tiles.
  return NATURAL_TILE_KEYS.includes(ch);
}

/**
 * Generate a simple city map with:
 * - Cross roads (center row/col)
 * - Random buildings on BUILD tiles
 * - Exactly one LAB coordinate picked on a BUILD tile (no special tile char)
 *
 * Returns rows encoded as strings for compact storage + meta for spawn rules.
 *
 * @param {Object} opts
 * @param {number} opts.seed
 * @param {number} opts.w
 * @param {number} opts.h
 * @param {number} [opts.buildingChance=0.18]  // density tweak
 * @param {number} [opts.minLabDistance=6]     // from map center (Manhattan)
 */
function generateMap({
  seed,
  w,
  h,
  buildingChance = MAP.DEFAULT_BUILDING_CHANCE,
  minLabDistance = MAP.DEFAULT_MIN_LAB_DISTANCE,
}) {
  // Use the city-layout helper to get terrain + lab position.
  const { rows, lab, buildTiles } = generateCityLayout({
    seed,
    w,
    h,
    buildingChance,
    minLabDistance,
  });

  const R = TILES.ROAD;
  const B = TILES.BUILD;
  const P = TILES.PARK;
  const F = TILES.FOREST;
  const W = TILES.WATER;
  const C = TILES.CEMETERY;

  // Separate seeded RNG for building metadata, so it stays deterministic.
  const rndForBuildings = mulberry32(seed | 0);
  const buildings = extractBuildings(rows, w, h, B, rndForBuildings);

  // --- Generic buildings for every BUILD tile (Option C + zoning) ---
  const genericTypes = [
    'HOUSE', 'APARTMENT', 'SHOP', 'RESTAURANT',
    'OFFICE', 'WAREHOUSE', 'PARKING'
  ];

  // Per-zone building pools (simple first pass; can be tuned later)
  const zonePools = {
    RES: [
      'HOUSE', 'HOUSE', 'HOUSE',
      'APARTMENT', 'APARTMENT',
      'PARKING'
    ],
    COM: [
      'SHOP', 'SHOP', 'SHOP',
      'RESTAURANT', 'RESTAURANT',
      'OFFICE'
    ],
    IND: [
      'WAREHOUSE', 'WAREHOUSE',
      'PARKING',
      'OFFICE'
    ],
    CIV: [
      'SCHOOL', 'SCHOOL',
      'HOSPITAL',
      'CLINIC',
      'PHARMACY',
      'POLICE',
      'FIRE_STATION',
      'GAS_STATION',
      'SAFEHOUSE',
      'OUTPOST',
      'BUNKER',
      'HQ',
      'RADIO_STATION',
    ],
  };

  const hasSpecial = new Set();
  for (const b of buildings) {
    hasSpecial.add(`${b.root.x},${b.root.y}`);
  }

  for (const pos of buildTiles) {
    const key = `${pos.x},${pos.y}`;
    if (hasSpecial.has(key)) continue;

    const zone = pos.zone || 'RES';
    const pool = zonePools[zone] || genericTypes;
    const type = pool[Math.floor(rndForBuildings() * pool.length)];

    buildings.push({
      id: `g_${key}`,
      type,
      root: { x: pos.x, y: pos.y },
      tiles: 1,
      floors: 1 + Math.floor(rndForBuildings() * 6),
    });
  }

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  return {
    seed,
    w,
    h,
    encoding: 'rows',
    legend: {
      [TILES.ROAD]:     'road',
      [TILES.BUILD]:    'build',
      [TILES.PARK]:     'park',
      [TILES.FOREST]:   'forest',
      [TILES.WATER]:    'water',
      [TILES.CEMETERY]: 'cemetery',
    },
    data: rows.map((r) => r.join('')),
    meta: {
      version: 1,
      lab,
      center: { x: cx, y: cy },
      passableChars: NATURAL_TILE_KEYS,
      spawn: {
        avoidChars: SPAWN_AVOID_TILE_CODES,
        safeRadiusFromLab: 2,
      },
      params: { buildingChance, minLabDistance },
      buildings,
      buildingPalette: MAP.BUILDING_PALETTE,
      terrainPalette: {
        [TILES.ROAD]:     MAP.TERRAIN_PALETTE.ROAD,
        [TILES.BUILD]:    MAP.TERRAIN_PALETTE.BUILD,
        [TILES.CEMETERY]: MAP.TERRAIN_PALETTE.CEMETERY,
        [TILES.PARK]:     MAP.TERRAIN_PALETTE.PARK,
        [TILES.FOREST]:   MAP.TERRAIN_PALETTE.FOREST,
        [TILES.WATER]:    MAP.TERRAIN_PALETTE.WATER,
      },
      terrain: rows.map(r => r.join('')),
    },
  };
}

/**
 * Helper: pick a random passable tile from a generated map’s data
 * (pure; does NOT consult Firestore).
 * @param {{data:string[], w:number, h:number, meta?:any}} map
 * @param {function():number} [rng] optional RNG (0..1)
 * @returns {{x:number,y:number}} coordinate
 */
function randomPassableTile(map, rng = Math.random) {
  const rows = map.data;
  for (let tries = 0; tries < 2000; tries++) {
    const x = Math.floor(rng() * map.w);
    const y = Math.floor(rng() * map.h);
    const ch = rows[y].charAt(x);
    if (isPassableChar(ch)) return { x, y };
  }
  // Fallback linear scan
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (isPassableChar(rows[y].charAt(x))) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

module.exports = {
  TILES,
  generateMap,
  isPassableChar,
  randomPassableTile,
};

// ld2030/v1/map-gen.js
// -----------------------------------------------------------------------------
// MAP PIPELINE – BACKEND + CLIENT FLOW (2025-11-27)
// -----------------------------------------------------------------------------
// 1) Entry point (this file)
//    - generateMap({ seed, w, h, buildingChance, minLabDistance })
//    - Pure + deterministic: given the same inputs, we always get the same map.
//    - Called ONLY from state.writeMapAndGame(...) when /init-game runs.
//
// 2) City layout (terrain + zoning)
//    - ./city-layout.js → generateCityLayout({ seed, w, h, buildingChance, minLabDistance })
//    - Returns:
//        rows       : 2D array of tile chars (TILES.*)
//        lab        : { x, y } lab position chosen on a BUILD tile
//        buildTiles : [{ x, y, zone }] for every BUILD tile
//                     zone ∈ "RES" | "COM" | "IND" | "CIV"
//    - city-layout is responsible for:
//        • Drawing the wobbly road network
//        • Marking non-road terrain: BUILD / PARK / FOREST / WATER / CEMETERY
//        • Assigning a zone to each BUILD tile for neighbourhood clustering
//
// 3) Buildings + meta (this file)
//    - We receive { rows, lab, buildTiles } from generateCityLayout.
//    - const buildings = extractBuildings(rows, w, h, TILES.BUILD, rng)
//        • Finds any multi-tile special buildings encoded in rows.
//    - For every remaining BUILD tile in buildTiles that doesn’t already have
//      a special building, we create a generic building using zone-based pools:
//        • RES → mostly HOUSE / APARTMENT / some PARKING
//        • COM → SHOP / RESTAURANT / some OFFICE
//        • IND → WAREHOUSE / PARKING / OFFICE
//        • CIV → SCHOOL, HOSPITAL, CLINIC, POLICE, FIRE_STATION, GAS_STATION,
//                SAFEHOUSE, OUTPOST, BUNKER, HQ, RADIO_STATION, etc.
//    - We then build the map document:
//        data[]           : array of strings, each row.join('') from rows
//        meta.lab         : lab position
//        meta.center      : map center
//        meta.passableChars / spawn rules
//        meta.buildings   : all buildings (special + generic)
//        meta.buildingPalette : from MAP.BUILDING_PALETTE
//        meta.terrainPalette  : from MAP.TERRAIN_PALETTE (ROAD/BUILD/PARK/…)
//        meta.terrain[]   : same as data[], used by client for terrain lookup
//
// 4) Firestore write (state.js)
//    - ./state.js → writeMapAndGame({ gameId, mapId, w, h, seed })
//      calls generateMap(...) and writes:
//        games/{gameId} : {
//          gameId, mapId, gridsize, status, startedAt,
//          mapMeta: {
//            version, lab, center,
//            passableChars, params,
//            buildings,
//            buildingPalette,
//            terrainPalette,
//            terrain,
//          },
//          updatedAt
//        }
//    - No separate /maps collection is used anymore for the live game.
//
// 5) HTTP init (init-game.js)
//    - ./init-game.js exposes POST /api/ld2030/v1/init-game
//    - Validates input and then delegates to state.writeMapAndGame(...).
//
// 6) iOS client (very high level, for reference)
//    - GameVM+Sign.swift listens on games/{gameId}.
//    - From game document it reads:
//        • gridsize → gridW / gridH
//        • mapMeta.buildings → GameVM.buildings
//        • mapMeta.buildingPalette → GameVM.buildingColors
//        • mapMeta.terrain → GameVM.terrain (rows as strings)
//        • mapMeta.terrainPalette → GameVM.terrainColors
//    - GameVM+Buildings / GameVM+Terrain provide:
//        • buildingAt(x,y), buildingColor(for:)
//        • terrainAt(x,y), terrainColorAt(x,y)
//    - GridView / GridCellView render the grid using those helpers,
//      showing the tile label (building type or terrain name) and (x,y).
//
// When we come back to map generation later:
//
//   • Change "city feel" (roads, parks, water, zoning) in ./city-layout.js.
//   • Change building clustering / zoning behaviour here in map-gen.js
//     (zonePools, special building logic, etc.).
//   • Any new terrain type → update TILES in config/config-tiles.js and MAP.TERRAIN_PALETTE in config/config-game.js
//     and make sure city-layout + isPassableChar() + legend are in sync.
//
// This comment is the single source of truth for how maps are generated end-to-end.
// -----------------------------------------------------------------------------