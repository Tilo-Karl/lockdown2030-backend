// ld2030/v1/engine/building-index.js
// In-process cached lookup for building footprint data.
//
// Purpose:
// - Build xy -> buildingId (and id -> building) once per map signature
// - Reuse across move / enter-building / stairs / search checks
//
// NOTE: This is intentionally NOT in move-rules to keep rules pure.

const BUILDING_INDEX_CACHE = new Map(); // cacheKey -> { byXY: Map, byId: Map }
const BUILDING_INDEX_CACHE_MAX = 8;

function makeCacheKey(game, mapMeta) {
  const mapId = String(game?.mapId || '');
  const version = String(mapMeta?.version || '');
  const buildingsLen = Array.isArray(mapMeta?.buildings) ? mapMeta.buildings.length : 0;
  return `${mapId}::${version}::${buildingsLen}`;
}

function buildBuildingIndex(mapMeta) {
  const byXY = new Map(); // "x,y" -> buildingId
  const byId = new Map(); // buildingId -> building
  const buildings = mapMeta?.buildings || [];

  for (const b of buildings) {
    if (!b?.id) continue; // buildings must have id
    byId.set(b.id, b);

    const tiles = Array.isArray(b.tiles) ? b.tiles : [];
    for (const t of tiles) {
      if (t && Number.isFinite(t.x) && Number.isFinite(t.y)) {
        byXY.set(`${t.x},${t.y}`, b.id);
      }
    }
  }

  return { byXY, byId };
}

function getBuildingIndex(game, mapMeta) {
  const key = makeCacheKey(game, mapMeta);

  const cached = BUILDING_INDEX_CACHE.get(key);
  if (cached) {
    // simple LRU touch
    BUILDING_INDEX_CACHE.delete(key);
    BUILDING_INDEX_CACHE.set(key, cached);
    return cached;
  }

  const built = buildBuildingIndex(mapMeta);
  BUILDING_INDEX_CACHE.set(key, built);

  // cap cache
  while (BUILDING_INDEX_CACHE.size > BUILDING_INDEX_CACHE_MAX) {
    const oldestKey = BUILDING_INDEX_CACHE.keys().next().value;
    BUILDING_INDEX_CACHE.delete(oldestKey);
  }

  return built;
}

// Optional: if you ever want to invalidate on demand (dev tools/tests)
function clearBuildingIndexCache() {
  BUILDING_INDEX_CACHE.clear();
}

module.exports = {
  getBuildingIndex,
  buildBuildingIndex,
  clearBuildingIndexCache,
};