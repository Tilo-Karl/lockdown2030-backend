// ld2030/v1/city-layout.js
// City terrain generator: roads, districts, parks/forest/water, lab location.

const { TILES, MAP } = require('./game-config');

// Tiny seeded PRNG (same as in map-gen; duplication is fine)
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Generate base city terrain + lab coordinate.
 * Returns { rows, lab } where rows is a 2D array of tile chars.
 */
function generateCityLayout({
  seed,
  w,
  h,
  buildingChance = MAP.DEFAULT_BUILDING_CHANCE,
  minLabDistance = MAP.DEFAULT_MIN_LAB_DISTANCE,
}) {
  const rnd = mulberry32(seed | 0);

  const R = TILES.ROAD;
  const B = TILES.BUILD;
  const P = TILES.PARK;
  const F = TILES.FOREST;
  const W = TILES.WATER;

  // ----- District centres -----
  const area = w * h;
  let districtCount;
  if (area <= 12 * 12) {
    districtCount = 3;
  } else if (area <= 16 * 16) {
    districtCount = 4;
  } else if (area <= 24 * 24) {
    districtCount = 5;
  } else {
    districtCount = 6;
  }

  const districtCenters = [];
  for (let i = 0; i < districtCount; i++) {
    // keep them away from border a bit
    const x = 1 + Math.floor(rnd() * Math.max(1, w - 2));
    const y = 1 + Math.floor(rnd() * Math.max(1, h - 2));
    districtCenters.push({ x, y });
  }

  function districtInfluence(x, y) {
    let best = Infinity;
    for (const c of districtCenters) {
      const d = manhattan({ x, y }, c);
      if (d < best) best = d;
    }
    const radius = Math.max(w, h) / 3;          // “city core” radius
    const t = Math.max(0, 1 - best / radius);   // 0..1, 1 = right on a centre
    return t;
  }

  // ----- Base grid: start as fully built-up city (all BUILD) -----
  const rows = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => B)
  );

  // ----- Road network -----
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  // Main cross
  for (let x = 0; x < w; x++) rows[cy][x] = R;
  for (let y = 0; y < h; y++) rows[y][cx] = R;

  // Optional secondary roads to make a small grid, if the map is big enough
  function paintVerticalRoad(x) {
    if (x < 0 || x >= w) return;
    for (let y = 0; y < h; y++) rows[y][x] = R;
  }
  function paintHorizontalRoad(y) {
    if (y < 0 || y >= h) return;
    for (let x = 0; x < w; x++) rows[y][x] = R;
  }

  if (w >= 10) {
    paintVerticalRoad(cx - 3);
    paintVerticalRoad(cx + 3);
  }
  if (h >= 10) {
    paintHorizontalRoad(cy - 3);
    paintHorizontalRoad(cy + 3);
  }

  // ----- Nature / open tiles (parks, forest, water) -----
  // We start from "everything is BUILD" and carve out some non-building tiles,
  // mainly toward the outskirts, so the city still feels packed.
  function pickNatureTile() {
    const r = rnd();
    if (r < 0.7) return P;     // parks most common
    if (r < 0.95) return F;    // forest
    return W;                  // very small amount of water
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] === R) continue; // never replace roads

      const influence = districtInfluence(x, y); // 0..1, higher = more urban core
      const r = rnd();

      if (influence >= 0.7) {
        // Deep city core: almost pure BUILD
        if (r < 0.99) {
          rows[y][x] = B;
        } else {
          rows[y][x] = pickNatureTile();
        }
      } else if (influence >= 0.4) {
        // Mid-ring: mostly BUILD, some nature
        if (r < 0.9) {
          rows[y][x] = B;
        } else {
          rows[y][x] = pickNatureTile();
        }
      } else {
        // Outskirts: mix of buildings and nature, but still more BUILD
        if (r < 0.75) {
          rows[y][x] = B;
        } else {
          rows[y][x] = pickNatureTile();
        }
      }
    }
  }

  // ----- Lab placement on a BUILD tile -----
  let lab = null;
  for (let i = 0; i < 2000 && !lab; i++) {
    const lx = Math.floor(rnd() * w);
    const ly = Math.floor(rnd() * h);
    if (rows[ly][lx] !== B) continue;
    if (manhattan({ x: lx, y: ly }, { x: cx, y: cy }) < minLabDistance) continue;
    lab = { x: lx, y: ly };
  }
  if (!lab) {
    for (let y = h - 1; y >= 0 && !lab; y--) {
      for (let x = w - 1; x >= 0 && !lab; x--) {
        if (rows[y][x] === B) lab = { x, y };
      }
    }
    if (!lab) lab = { x: cx, y: cy };
  }

  // Collect all BUILD tile positions for generic building assignment (Option C)
  const buildTiles = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] === B) {
        buildTiles.push({ x, y });
      }
    }
  }

  return {
    rows,
    lab,
    districtCenters,
    buildTiles,   // added for generic building generation (Option C)
  };
}

module.exports = {
  generateCityLayout,
};