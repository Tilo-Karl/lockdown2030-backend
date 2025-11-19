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

  // Base grid: start as PARK everywhere (generic open land).
  const rows = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => P)
  );

  // Cross-road through center
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let x = 0; x < w; x++) rows[cy][x] = R;
  for (let y = 0; y < h; y++) rows[y][cx] = R;

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

  // Scatter buildings + nature
  const baseForestChance = 0.10;
  const baseWaterChance = 0.05;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== P) continue; // don’t touch roads

      const influence = districtInfluence(x, y); // 0..1

      // Near centre: more BUILD, less forest/water.
      // Far: fewer buildings, more forest/water.
      const localBuildingChance = Math.min(
        0.8,
        buildingChance * (0.4 + 1.6 * influence) // ~0.07 at edge, ~0.36 near core
      );
      const localForestChance = baseForestChance * (1 - influence);
      const localWaterChance  = baseWaterChance  * (1 - 0.5 * influence);

      const r = rnd();
      if (r < localBuildingChance) {
        rows[y][x] = B;
      } else if (r < localBuildingChance + localForestChance) {
        rows[y][x] = F;
      } else if (r < localBuildingChance + localForestChance + localWaterChance) {
        rows[y][x] = W;
      } else {
        // stays PARK
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

  return {
    rows,
    lab,
  };
}

module.exports = {
  generateCityLayout,
};