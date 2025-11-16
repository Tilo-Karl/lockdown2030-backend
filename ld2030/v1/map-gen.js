// ld2030/v1/map-gen.js
// Pure, deterministic map generator (no Firebase/Express).

// Shared game config (tile codes, etc.)
const { TILES } = require('./game-config');

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
  // roads + empty are passable by default
  return ch === TILES.EMPTY || ch === TILES.ROAD;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Scan the grid for contiguous building regions and generate simple building metadata.
// For now we treat any connected cluster of BUILD tiles as a single building and
// assign a random floor count in a small range (deterministic via rnd).
function extractBuildings(rows, w, h, BUILD_CH, rnd) {
  const visited = Array.from({ length: h }, () => Array.from({ length: w }, () => false));
  const buildings = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== BUILD_CH || visited[y][x]) continue;

      // Flood fill to get all tiles belonging to this building
      const queue = [{ x, y }];
      visited[y][x] = true;
      const tiles = [];

      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift();
        tiles.push({ x: cx, y: cy });

        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (visited[ny][nx]) continue;
          if (rows[ny][nx] !== BUILD_CH) continue;
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }

      if (tiles.length === 0) continue;

      // Deterministic "root" tile (top-most, then left-most)
      let root = tiles[0];
      for (const t of tiles) {
        if (t.y < root.y || (t.y === root.y && t.x < root.x)) {
          root = t;
        }
      }

      // Simple deterministic floors: between 1 and 3
      const minFloors = 1;
      const maxFloors = 3;
      const floors = minFloors + Math.floor(rnd() * (maxFloors - minFloors + 1));

      buildings.push({
        id: `b${buildings.length}`,
        type: 'generic',
        root,
        tiles: tiles.length,
        floors,
      });
    }
  }

  return buildings;
}

/**
 * Generate a simple city map with:
 * - Cross roads (center row/col)
 * - Random buildings
 * - Exactly one LAB placed away from center
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
  const E = TILES.EMPTY, R = TILES.ROAD, B = TILES.BUILD, L = TILES.LAB;

  // base grid
  const rows = Array.from({ length: h }, () => Array.from({ length: w }, () => E));

  // cross-road through center
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let x = 0; x < w; x++) rows[cy][x] = R;
  for (let y = 0; y < h; y++) rows[y][cx] = R;

  // scatter buildings (never overwrite roads)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] === E && rnd() < buildingChance) rows[y][x] = B;
    }
  }

  // place exactly one lab (on empty, not on road/building) and away from center
  let lab = null;
  for (let i = 0; i < 2000 && !lab; i++) {
    const lx = Math.floor(rnd() * w);
    const ly = Math.floor(rnd() * h);
    if (rows[ly][lx] !== E) continue;
    if (manhattan({ x: lx, y: ly }, { x: cx, y: cy }) < minLabDistance) continue;
    rows[ly][lx] = L;
    lab = { x: lx, y: ly };
  }
  if (!lab) {
    // fallback: bottom-right most distant empty spot
    for (let y = h - 1; y >= 0 && !lab; y--) {
      for (let x = w - 1; x >= 0 && !lab; x--) {
        if (rows[y][x] === E) {
          rows[y][x] = L;
          lab = { x, y };
        }
      }
    }
  }
  
  // Derive simple building metadata from the finished grid.
  const buildings = extractBuildings(rows, w, h, B, rnd);

  return {
    seed, w, h,
    encoding: 'rows',
    legend: { '0': 'empty', '1': 'road', '2': 'building', '3': 'lab' },
    // compact payload for Firestore
    data: rows.map(r => r.join('')),
    // extra meta for engine logic (non-breaking additions)
    meta: {
      version: 1,
      lab,                        // {x,y}
      center: { x: cx, y: cy },
      passableChars: [E, R],      // what the engine should treat as walkable
      spawn: {
        avoidChars: [B, L],       // don’t spawn on buildings/lab
        safeRadiusFromLab: 2,     // optional UI/logic hint
      },
      params: { buildingChance, minLabDistance },
      buildings,                  // [{id, type, root:{x,y}, tiles, floors}]
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
  // fallback linear scan
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