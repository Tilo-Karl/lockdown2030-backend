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

const { normalizeBuildingType } = require('./map-buildings');
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
  const { rows, lab, buildTiles, facilities } = generateCityLayout({
    seed,
    w,
    h,
    buildingChance,
    minLabDistance,
  });

  const rndForBuildings = mulberry32(seed | 0);

  const districtsEnabled = DISTRICTS && DISTRICTS.ENABLED === true;
  const districtCount = districtsEnabled
    ? (typeof DISTRICTS.countForGrid === 'function' ? DISTRICTS.countForGrid({ w, h }) : 1)
    : 1;

  const districtForTile = (tile) => {
    if (!districtsEnabled || typeof DISTRICTS.districtForPos !== 'function') return 0;
    return DISTRICTS.districtForPos({ x: tile.x, y: tile.y, w, h, count: districtCount });
  };

  const tilesByDistrict = new Map();
  (buildTiles || []).forEach((pos) => {
    if (!pos) return;
    const x = Number(pos.x);
    const y = Number(pos.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const districtId = districtForTile({ x, y });
    const list = tilesByDistrict.get(districtId) || [];
    list.push({ x, y, zone: pos.zone || 'RES' });
    tilesByDistrict.set(districtId, list);
  });

  const requiredPerDistrict = Array.isArray(MAP?.REQUIRED_PER_DISTRICT)
    ? MAP.REQUIRED_PER_DISTRICT.map((item) => item?.type || item).filter(Boolean)
    : [];

  const buildings = [];

  function randomInt(min, max) {
    return Math.floor(rndForBuildings() * (max - min + 1)) + min;
  }

  const smallTypes = new Set([
    'HOUSE', 'SHOP', 'BAR', 'RESTAURANT', 'PHARMACY', 'CHURCH', 'SAFEHOUSE',
    'OUTPOST', 'MOTEL', 'BUNKER',
  ]);
  const facilityTypes = new Set(requiredPerDistrict);

  function floorsForType(type) {
    if (facilityTypes.has(type)) return randomInt(1, 4);
    if (smallTypes.has(type)) return randomInt(1, 2);
    // larger structures
    return randomInt(2, 6);
  }

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
      'ISP',
      'LABORATORY',
      'TRANSFORMER_SUBSTATION',
      'WATER_PLANT',
      'CHURCH',
    ],
  };

  tilesByDistrict.forEach((tiles, districtId) => {
    const available = [...tiles];
    requiredPerDistrict.forEach((reqType) => {
      if (!available.length) return;
      const idx = Math.floor(rndForBuildings() * available.length);
      const tile = available.splice(idx, 1)[0];
      if (!tile) return;
      const floors = floorsForType(reqType);
      buildings.push({
        id: `fac_${reqType}_${tile.x},${tile.y}`,
        type: reqType,
        root: { x: tile.x, y: tile.y },
        tiles: [{ x: tile.x, y: tile.y }],
        tileCount: 1,
        floors,
        districtId,
      });
    });

    available.forEach((tile) => {
      const zone = tile.zone || 'RES';
      const pool = zonePools[zone] || genericTypes;
      const baseType = pool[Math.floor(rndForBuildings() * pool.length)] || 'HOUSE';
      const baseFloors = floorsForType(baseType);
      const finalType = normalizeBuildingType(baseType, baseFloors);
      buildings.push({
        id: `g_${tile.x},${tile.y}`,
        type: finalType,
        root: { x: tile.x, y: tile.y },
        tiles: [{ x: tile.x, y: tile.y }],
        tileCount: 1,
        floors: baseFloors,
        districtId,
      });
    });
  });

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);

  const histogram = buildings.reduce((acc, b) => {
    const type = String(b?.type || 'UNKNOWN');
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(histogram).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const facilityCount = buildings.filter((b) => String(b?.id || '').startsWith('fac_')).length;
  const genericCount = buildings.length - facilityCount;
  //console.log('[map-gen] building type histogram', { top10: entries, total: buildings.length, facilityCount, genericCount });

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
