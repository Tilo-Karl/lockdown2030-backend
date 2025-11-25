// ld2030/v1/map-gen.js
// Pure, deterministic map generator (no Firebase/Express).

// Shared game config (tile codes, etc.)
const { TILES, MAP } = require('./game-config');
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
  // Roads + most land tiles are passable by default; water/blocked are not.
  return (
    ch === TILES.ROAD ||
    ch === TILES.BUILD ||
    ch === TILES.PARK ||
    ch === TILES.FOREST
  );
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

  // Separate seeded RNG for building metadata, so it stays deterministic.
  const rndForBuildings = mulberry32(seed | 0);
  const buildings = extractBuildings(rows, w, h, B, rndForBuildings);

  // --- Generic buildings for every BUILD tile (Option C) ---
  const genericTypes = [
    'HOUSE','APARTMENT','SHOP','RESTAURANT',
    'OFFICE','WAREHOUSE','PARKING'
  ];

  const hasSpecial = new Set();
  for (const b of buildings) {
    hasSpecial.add(`${b.root.x},${b.root.y}`);
  }

  for (const pos of buildTiles) {
    const key = `${pos.x},${pos.y}`;
    if (hasSpecial.has(key)) continue;
    const type = genericTypes[Math.floor(rndForBuildings() * genericTypes.length)];
    buildings.push({
      id: `g_${key}`,
      type,
      root: { x: pos.x, y: pos.y },
      tiles: 1,
      floors: 1 + Math.floor(rndForBuildings() * 6)
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
      [TILES.ROAD]:   'road',
      [TILES.BUILD]:  'build',
      [TILES.PARK]:   'park',
      [TILES.FOREST]: 'forest',
      [TILES.WATER]:  'water',
    },
    data: rows.map((r) => r.join('')),
    meta: {
      version: 1,
      lab,
      center: { x: cx, y: cy },
      passableChars: [R, B, P, F],
      spawn: {
        avoidChars: [B, W],
        safeRadiusFromLab: 2,
      },
      params: { buildingChance, minLabDistance },
      buildings,
      buildingPalette: MAP.BUILDING_PALETTE,
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