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
function generateHybridLayout({
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

  // Size-aware side streets: spurs branching off the backbone
  function carveRoadSpur(x, y, dx, dy, minLen, maxLen) {
    const len = minLen + Math.floor(rnd() * (maxLen - minLen + 1));
    let nx = x;
    let ny = y;

    for (let i = 0; i < len; i++) {
      nx += dx;
      ny += dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) break;
      if (rows[ny][nx] === W) break;      // don't cut straight through water
      rows[ny][nx] = R;
    }
  }

  // Tune spur density/length by map size
  let spurEvery;
  let spurChance;
  let spurMinLen;
  let spurMaxLen;

  const smallMap = w <= 12 && h <= 12;
  const mediumMap = !smallMap && w <= 24 && h <= 24;

  if (smallMap) {
    // Compact grid: a few short alleys
    spurEvery = 4;
    spurChance = 0.55;
    spurMinLen = 2;
    spurMaxLen = 3;
  } else if (mediumMap) {
    // Denser mid-size city
    spurEvery = 3;
    spurChance = 0.65;
    spurMinLen = 2;
    spurMaxLen = 5;
  } else {
    // Large maps: more frequent and longer spurs
    spurEvery = 3;
    spurChance = 0.75;
    spurMinLen = 3;
    spurMaxLen = 6;
  }

  // Vertical spurs from center column (left/right)
  for (let y = 1; y < h - 1; y += spurEvery) {
    if (rnd() < spurChance) carveRoadSpur(cx, y, -1, 0, spurMinLen, spurMaxLen); // go left
    if (rnd() < spurChance) carveRoadSpur(cx, y, +1, 0, spurMinLen, spurMaxLen); // go right
  }

  // Horizontal spurs from center row (up/down)
  for (let x = 1; x < w - 1; x += spurEvery) {
    if (rnd() < spurChance) carveRoadSpur(x, cy, 0, -1, spurMinLen, spurMaxLen); // go up
    if (rnd() < spurChance) carveRoadSpur(x, cy, 0, +1, spurMinLen, spurMaxLen); // go down
  }

  // ----- Nature / open tiles (parks, forest, water) -----
  // Phase 1 HYBRID:
  // - Add ONE water feature (pond or simple river) if map is big enough
  // - Add a few park / forest blobs
  // - Everything else stays BUILD so the city feels dense.

  function isRoad(x, y) {
    return rows[y][x] === R;
  }

  function isWater(x, y) {
    return rows[y][x] === W;
  }

  function isBuild(x, y) {
    return rows[y][x] === B;
  }

  // Helper: safely paint a tile if it's currently BUILD (never overwrite road/water)
  function paintIfBuild(x, y, tile) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    if (rows[y][x] === B) {
      rows[y][x] = tile;
    }
  }

  // ----- Water feature -----
  // Decide if we want water and what type.
  let waterMode = 'none';
  if (w >= 8 && h >= 8) {
    const r = rnd();
    if (r < 0.35) {
      waterMode = 'pond';
    } else if (r < 0.7) {
      waterMode = 'lake';
    } else {
      waterMode = 'river';
    }
  }

  if (waterMode === 'pond' || waterMode === 'lake') {
    // Random rectangular blob somewhere not on main roads
    const maxPondSize = Math.max(2, Math.floor(Math.min(w, h) / (waterMode === 'lake' ? 3 : 5)));
    const blobW = 2 + Math.floor(rnd() * maxPondSize);
    const blobH = 2 + Math.floor(rnd() * maxPondSize);

    // Try a few times to find a good location
    for (let tries = 0; tries < 20; tries++) {
      const x0 = Math.floor(rnd() * (w - blobW));
      const y0 = Math.floor(rnd() * (h - blobH));

      // Avoid directly overwriting major cross center to keep roads visible
      let touchesRoad = false;
      for (let yy = y0; yy < y0 + blobH && !touchesRoad; yy++) {
        for (let xx = x0; xx < x0 + blobW; xx++) {
          if (isRoad(xx, yy)) {
            touchesRoad = true;
            break;
          }
        }
      }
      if (touchesRoad) continue;

      // Paint the blob
      for (let yy = y0; yy < y0 + blobH; yy++) {
        for (let xx = x0; xx < x0 + blobW; xx++) {
          paintIfBuild(xx, yy, W);
        }
      }
      break;
    }
  } else if (waterMode === 'river') {
    // Simple vertical or horizontal river with slight wiggle
    const vertical = rnd() < 0.5;
    if (vertical) {
      let x0 = Math.floor(rnd() * w);
      for (let y = 0; y < h; y++) {
        // Avoid overwriting roads if possible by shifting a bit
        let x = x0;
        if (isRoad(x, y)) {
          if (x + 1 < w && !isRoad(x + 1, y)) x = x + 1;
          else if (x - 1 >= 0 && !isRoad(x - 1, y)) x = x - 1;
        }
        paintIfBuild(x, y, W);

        // Occasionally wiggle
        if (rnd() < 0.3) {
          const dir = rnd() < 0.5 ? -1 : 1;
          const nx = x0 + dir;
          if (nx >= 0 && nx < w) x0 = nx;
        }
      }
    } else {
      let y0 = Math.floor(rnd() * h);
      for (let x = 0; x < w; x++) {
        let y = y0;
        if (isRoad(x, y)) {
          if (y + 1 < h && !isRoad(x, y + 1)) y = y + 1;
          else if (y - 1 >= 0 && !isRoad(x, y - 1)) y = y - 1;
        }
        paintIfBuild(x, y, W);

        if (rnd() < 0.3) {
          const dir = rnd() < 0.5 ? -1 : 1;
          const ny = y0 + dir;
          if (ny >= 0 && ny < h) y0 = ny;
        }
      }
    }
  }

  // ----- Park / forest patches -----
  // Number of green patches scales a bit with map size
  const basePatches = area <= 12 * 12 ? 3 : area <= 24 * 24 ? 5 : 7;

  function paintGreenBlob(tile, cx0, cy0, maxRadius) {
    const radius = 1 + Math.floor(rnd() * maxRadius);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx0 + dx;
        const y = cy0 + dy;
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        if (isRoad(x, y) || isWater(x, y)) continue;

        // Slightly irregular shape: only fill some of the ring
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist <= radius && rnd() < 0.85) {
          paintIfBuild(x, y, tile);
        }
      }
    }
  }

  for (let i = 0; i < basePatches; i++) {
    // Decide type: more parks than forests in general
    const r = rnd();
    const tile = r < 0.6 ? P : F;

    // Try to find a BUILD tile to seed the blob
    let placed = false;
    for (let tries = 0; tries < 30 && !placed; tries++) {
      const x = Math.floor(rnd() * w);
      const y = Math.floor(rnd() * h);

      if (!isBuild(x, y)) continue;

      // Mild bias: parks a bit closer to center, forest a bit farther out
      const centerDist = manhattan({ x, y }, { x: cx, y: cy });
      const maxDist = w + h;
      const t = centerDist / maxDist;

      if (tile === P && t > 0.8) continue;  // avoid only outer ring parks
      if (tile === F && t < 0.2) continue;  // avoid forests right in the core

      const maxRadius = Math.max(1, Math.floor(Math.min(w, h) / 5));
      paintGreenBlob(tile, x, y, maxRadius);
      placed = true;
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

function generateCityLayout(opts) {
  const style = MAP.CITY_STYLE || 'HYBRID';

  switch (style) {
    case 'HYBRID':
    default:
      return generateHybridLayout(opts);
  }
}

module.exports = {
  generateCityLayout,
};