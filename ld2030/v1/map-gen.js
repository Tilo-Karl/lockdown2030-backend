// ld2030/v1/map-gen.js
// Pure, deterministic map generator (no Firebase/Express).

// Shared game config (tile codes, etc.)
const { TILES, MAP } = require('./game-config');
const { extractBuildings } = require('./map-buildings');

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

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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
function generateMap({ seed, w, h, buildingChance = 0.18, minLabDistance = 6 }) {
  const rnd = mulberry32(seed | 0);

  const R = TILES.ROAD;
  const B = TILES.BUILD;
  const P = TILES.PARK;
  const F = TILES.FOREST;
  const W = TILES.WATER;

  // Base grid: start as PARK everywhere (generic open land).
  const rows = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => P)
  );

  // Cross-road through center
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let x = 0; x < w; x++) rows[cy][x] = R;
  for (let y = 0; y < h; y++) rows[y][cx] = R;

  // Scatter buildings and other terrain on non-road tiles
  const forestChance = 0.10; // 10% of non-road, non-building tiles become forest
  const waterChance = 0.05;  // 5% become water

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== P) continue; // only modify base PARK tiles, never roads

      const r = rnd();
      if (r < buildingChance) {
        rows[y][x] = B; // building footprint
      } else if (r < buildingChance + forestChance) {
        rows[y][x] = F; // forest / dense area
      } else if (r < buildingChance + forestChance + waterChance) {
        rows[y][x] = W; // water
      } else {
        // remain PARK
      }
    }
  }

  // Pick a LAB location on a BUILD tile, away from center.
  // This is just a coordinate in meta.lab; tile char stays BUILD.
  let lab = null;
  for (let i = 0; i < 2000 && !lab; i++) {
    const lx = Math.floor(rnd() * w);
    const ly = Math.floor(rnd() * h);
    if (rows[ly][lx] !== B) continue;
    if (manhattan({ x: lx, y: ly }, { x: cx, y: cy }) < minLabDistance) continue;
    lab = { x: lx, y: ly };
  }

  if (!lab) {
    // Fallback: pick the bottom-right most BUILD tile, if any.
    for (let y = h - 1; y >= 0 && !lab; y--) {
      for (let x = w - 1; x >= 0 && !lab; x--) {
        if (rows[y][x] === B) {
          lab = { x, y };
        }
      }
    }
    // Absolute fallback: center of map, even if it's not BUILD.
    if (!lab) {
      lab = { x: cx, y: cy };
    }
  }
  
  // Derive building metadata from the finished grid.
  const buildings = extractBuildings(rows, w, h, B, rnd);

  return {
    seed,
    w,
    h,
    encoding: 'rows',
    legend: {
      [TILES.ROAD]: 'road',
      [TILES.BUILD]: 'build',
      [TILES.PARK]: 'park',
      [TILES.FOREST]: 'forest',
      [TILES.WATER]: 'water',
    },
    // Compact payload for Firestore
    data: rows.map((r) => r.join('')),
    // Extra meta for engine logic (non-breaking additions)
    meta: {
      version: 1,
      lab, // {x,y}
      center: { x: cx, y: cy },
      passableChars: [R, B, P, F], // walkable terrain
      spawn: {
        // Avoid spawning directly in water or on buildings
        avoidChars: [B, W],
        safeRadiusFromLab: 2,
      },
      params: { buildingChance, minLabDistance },
      buildings, // [{id, type, root:{x,y}, tiles, floors}]
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