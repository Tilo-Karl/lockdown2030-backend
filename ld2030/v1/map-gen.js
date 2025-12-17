// ld2030/v1/map-gen.js
// Pure, deterministic map generator (no Firebase/Express).

const {
  TILES,
  MAP,
  DISTRICTS,
  TILE_META,
  NATURAL_TILE_KEYS,
  SPAWN_AVOID_TILE_CODES,
} = require('./config');

const { extractBuildings, normalizeBuildingType } = require('./map-buildings');
const { generateCityLayout } = require('./city-layout');
const { applyNamesToMapMeta } = require('./map-namegen');

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

function isPassableChar(ch) {
  return NATURAL_TILE_KEYS.includes(ch);
}

function generateMap({
  seed,
  w,
  h,
  buildingChance = MAP.DEFAULT_BUILDING_CHANCE,
  minLabDistance = MAP.DEFAULT_MIN_LAB_DISTANCE,
}) {
  const { rows, lab, buildTiles } = generateCityLayout({
    seed,
    w,
    h,
    buildingChance,
    minLabDistance,
  });

  const B = TILES.BUILD;

  const rndForBuildings = mulberry32(seed | 0);
  const buildings = extractBuildings(rows, w, h, B, rndForBuildings);

  const districtsEnabled = DISTRICTS && DISTRICTS.ENABLED === true;
  const districtCount = districtsEnabled
    ? (typeof DISTRICTS.countForGrid === 'function' ? DISTRICTS.countForGrid({ w, h }) : 1)
    : 1;

  // --- Generic buildings for every BUILD tile (Option C + zoning) ---
  const genericTypes = [
    'HOUSE',
    'SHOP',
    'BAR',
    'RESTAURANT',
    'OFFICE',
    'WAREHOUSE',
    'PARKING',
    'CHURCH',
    'MOTEL',
  ];

  const zonePools = {
    RES: [
      'HOUSE', 'HOUSE', 'HOUSE',
      'PARKING',
    ],
    COM: [
      'SHOP', 'SHOP', 'SHOP',
      'RESTAURANT', 'RESTAURANT',
      'OFFICE',
      'BAR',
    ],
    IND: [
      'WAREHOUSE', 'WAREHOUSE',
      'PARKING',
      'OFFICE',
    ],
    CIV: [
      'SCHOOL',
      'PHARMACY',
      'POLICE',
      'FIRE_STATION',
      'GAS_STATION',
      'SAFEHOUSE',
      'OUTPOST',
      'BUNKER',
      'HQ',
      'RADIO_STATION',
      'LABORATORY',
      'TRANSFORMER_SUBSTATION',
      'CHURCH',
    ],
  };

  const hasSpecial = new Set();
  for (const b of buildings) {
    const footprint = Array.isArray(b.tiles) ? b.tiles : [];
    for (const t of footprint) {
      hasSpecial.add(`${t.x},${t.y}`);
    }
  }

  for (const pos of buildTiles) {
    const key = `${pos.x},${pos.y}`;
    if (hasSpecial.has(key)) continue;

    const zone = pos.zone || 'RES';
    const pool = zonePools[zone] || genericTypes;
    const baseType = pool[Math.floor(rndForBuildings() * pool.length)] || 'HOUSE';

    const floors = 1 + Math.floor(rndForBuildings() * 6);
    const finalType = normalizeBuildingType(baseType, floors);

    const tiles = [{ x: pos.x, y: pos.y }];
    buildings.push({
      id: `g_${key}`,
      type: finalType,
      root: { x: pos.x, y: pos.y },
      tiles,
      tileCount: tiles.length,
      floors,
    });
  }

  // Assign districtId to every building (for UI outlines + gameplay)
  if (districtsEnabled && typeof DISTRICTS.districtForPos === 'function') {
    for (const b of buildings) {
      const rx = b?.root?.x;
      const ry = b?.root?.y;
      b.districtId = DISTRICTS.districtForPos({ x: rx, y: ry, w, h, count: districtCount });
    }
  } else {
    for (const b of buildings) b.districtId = 0;
  }

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  const terrainPalette = {};
  Object.values(TILES).forEach((code) => {
    const meta = TILE_META[code];
    if (meta && meta.colorHex) terrainPalette[code] = meta.colorHex;
  });

  const mapMeta = {
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
    terrainPalette,
    terrain: rows.map((r) => r.join('')),
    districts: {
      enabled: districtsEnabled,
      count: districtCount,
    },
  };

  // Apply city/district/building names AFTER buildings have districtId.
  applyNamesToMapMeta({
    mapMeta,
    seed,
    w,
    h,
    districtCount,
  });

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
      [TILES.CEMETERY]: 'cemetery',
    },
    data: rows.map((r) => r.join('')),
    meta: mapMeta,
  };
}

function randomPassableTile(map, rng = Math.random) {
  const rows = map.data;
  for (let tries = 0; tries < 2000; tries++) {
    const x = Math.floor(rng() * map.w);
    const y = Math.floor(rng() * map.h);
    const ch = rows[y].charAt(x);
    if (isPassableChar(ch)) return { x, y };
  }
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