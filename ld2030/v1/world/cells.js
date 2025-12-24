// ld2030/v1/world/cells.js
// Runtime world cells helpers + init writers (V1).
//
// Rule B: DO NOT persist maxHp anywhere in cells/*.
// AND (if you want it): do not persist search.maxRemaining either.
// All max values are DERIVED from config-game WORLD.
//
// Big Bang V1:
// - actions must NOT depend on mapMeta for runtime truth
// - cells should carry any static “what is here?” metadata needed by actions
// - BUT each cell’s runtime state (hp/fuse/water/search/etc) remains independent
//
// This file writes:
// - outside cells (layer=0, z=0) for every tile
// - inside cells (layer=1, z=0..floors-1) for every building tile

const { WORLD } = require('../config/config-game');
const { TILE_META: DEFAULT_TILE_META } = require('../config/config-tile');

function cellIdFor(x, y, z, layer) {
  return `c_${x}_${y}_${z}_${layer}`;
}

function parseCellId(cellId) {
  const m = /^c_(-?\d+)_(-?\d+)_(-?\d+)_(\d+)$/.exec(String(cellId || ''));
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  const z = Number(m[3]);
  const layer = Number(m[4]);
  if (![x, y, z, layer].every(Number.isFinite)) return null;
  if (layer !== 0 && layer !== 1) return null;
  return { x, y, z, layer };
}

function terrainCodeAt(mapMeta, x, y) {
  const t = mapMeta?.terrain;
  if (!t) return null;

  if (Array.isArray(t) && typeof t[0] === 'string') {
    const row = t[y];
    return row ? row[x] : null;
  }

  if (Array.isArray(t) && Array.isArray(t[0])) {
    return (t[y] && t[y][x] != null) ? t[y][x] : null;
  }

  if (typeof t === 'string') {
    const rows = t.split('\n');
    const row = rows[y];
    return row ? row[x] : null;
  }

  return null;
}

// Derived search max (single truth)
function searchMaxForBuildingType(type) {
  const search = WORLD?.CELLS?.INSIDE?.SEARCH || {};
  if (typeof search.maxRemainingForBuildingType === 'function') {
    const v = search.maxRemainingForBuildingType(type);
    return Number.isFinite(v) ? Number(v) : 3;
  }
  const d = search.MAX_REMAINING_DEFAULT;
  return Number.isFinite(d) ? Number(d) : 3;
}

// NOTE: We DO NOT trust/persist s.maxRemaining. It is derived from config.
function ensureSearch(cell) {
  const c = cell && typeof cell === 'object' ? cell : {};
  const s = (c.search && typeof c.search === 'object') ? c.search : {};

  // building type is stored on inside cells (either c.type or c.building.type)
  const bType = (c.type != null) ? c.type : (c.building?.type ?? null);

  const maxRemaining = searchMaxForBuildingType(bType);
  const remaining = Number.isFinite(s.remaining) ? Number(s.remaining) : maxRemaining;

  return {
    maxRemaining,
    remaining,
    searchedCount: Number.isFinite(s.searchedCount) ? Number(s.searchedCount) : 0,
  };
}

function decrementSearch(cell) {
  const s = ensureSearch(cell);
  if (s.remaining <= 0) return { ...s, remaining: 0 };
  return { ...s, remaining: s.remaining - 1, searchedCount: s.searchedCount + 1 };
}

function iterBuildingTiles(building) {
  if (!building) return [];

  if (Array.isArray(building.tiles) && building.tiles.length) {
    return building.tiles
      .map(t => ({ x: Number(t.x), y: Number(t.y) }))
      .filter(t => Number.isFinite(t.x) && Number.isFinite(t.y));
  }

  if (Array.isArray(building.footprint) && building.footprint.length) {
    return building.footprint
      .map(t => ({ x: Number(t.x), y: Number(t.y) }))
      .filter(t => Number.isFinite(t.x) && Number.isFinite(t.y));
  }

  const x0 = Number(building.x);
  const y0 = Number(building.y);
  const w = Number(building.w);
  const h = Number(building.h);
  if ([x0, y0, w, h].every(Number.isFinite) && w > 0 && h > 0) {
    const out = [];
    for (let yy = y0; yy < y0 + h; yy++) {
      for (let xx = x0; xx < x0 + w; xx++) out.push({ x: xx, y: yy });
    }
    return out;
  }

  return [];
}

// Build a fast lookup for “is there a building footprint on (x,y)?”
// This is ONLY used during init writes; runtime actions should read cells/*.
function buildOutsideBuildingStampIndex(mapMeta) {
  const buildings = Array.isArray(mapMeta?.buildings) ? mapMeta.buildings : [];
  const idx = new Map(); // "x,y" -> stamp

  for (const b of buildings) {
    const tiles = iterBuildingTiles(b);
    if (!tiles.length) continue;

    const type = (b.type != null) ? String(b.type) : null;
    const floors = Number.isFinite(b.floors) ? Math.max(1, Math.floor(b.floors)) : 1;

    const districtId = Number.isFinite(b.districtId) ? Math.trunc(b.districtId) : 0;

    const rx = Number.isFinite(b?.root?.x) ? Math.trunc(b.root.x) : (tiles[0]?.x ?? 0);
    const ry = Number.isFinite(b?.root?.y) ? Math.trunc(b.root.y) : (tiles[0]?.y ?? 0);

    const name = (b.name != null) ? String(b.name) : null;

    const stamp = {
      // No buildingId stored (by request). Use root as the grouping key if needed later.
      type,
      floors,
      districtId,
      name,
      root: { x: rx, y: ry },
    };

    for (const t of tiles) {
      const key = `${t.x},${t.y}`;
      // first write wins (overlaps shouldn’t happen)
      if (!idx.has(key)) idx.set(key, stamp);
    }
  }

  return idx;
}

// Derived maxes (single truth)
function derivedInsideMaxes(type) {
  const inside = WORLD?.CELLS?.INSIDE || {};
  const maxHp = (typeof inside.maxHpForBuildingType === 'function')
    ? inside.maxHpForBuildingType(type)
    : (inside.HP_MAX_DEFAULT ?? 50);

  const comp = inside.COMPONENT_MAX || {};
  const generatorInstalledDefault = inside?.GENERATOR?.INSTALLED_DEFAULT === true;

  const searchMax = searchMaxForBuildingType(type);

  return {
    maxHp: Number.isFinite(maxHp) ? Number(maxHp) : 50,
    fuseMax: Number.isFinite(comp.fuseHp) ? Number(comp.fuseHp) : 10,
    waterMax: Number.isFinite(comp.waterHp) ? Number(comp.waterHp) : 10,
    generatorMax: Number.isFinite(comp.generatorHp) ? Number(comp.generatorHp) : 0,
    generatorInstalledDefault,
    searchMax,
  };
}

async function writeOutsideCells({ db, admin, cellsCol, w, h, mapMeta }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  const tileMeta = (mapMeta?.tileMeta && typeof mapMeta.tileMeta === 'object')
    ? mapMeta.tileMeta
    : DEFAULT_TILE_META;

  // Precompute footprint -> building “stamp” so actions can know “a building exists here”
  // WITHOUT touching mapMeta at runtime.
  const buildingAtXY = buildOutsideBuildingStampIndex(mapMeta);

  let batch = db.batch();
  let ops = 0;
  let written = 0;

  async function commitIfFull() {
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const code = terrainCodeAt(mapMeta, x, y);
      const meta = (code != null && tileMeta && tileMeta[code]) ? tileMeta[code] : {};

      const id = cellIdFor(x, y, 0, 0);
      const ref = cellsCol.doc(id);

      const bStamp = buildingAtXY.get(`${x},${y}`) || null;

      batch.set(
        ref,
        {
          cellId: id,
          x,
          y,
          z: 0,
          layer: 0,

          terrain: code,
          blocksMove: meta.blocksMovement === true,
          moveCost: Number.isFinite(meta.moveCost) ? meta.moveCost : 1,

          // Static “what is here?” metadata for actions (no mapMeta truth path):
          // NOTE: No buildingId stored. Root is the grouping key if you ever need it.
          building: bStamp,

          // Outside not destructible in V1
          hp: 0,
          ruined: false,

          createdAt: serverTs(),
          updatedAt: serverTs(),
        },
        { merge: true }
      );

      ops++;
      written++;
      await commitIfFull();
    }
  }

  if (ops > 0) await batch.commit();
  return { written };
}

async function writeInsideCells({ db, admin, cellsCol, mapMeta }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();
  const buildings = Array.isArray(mapMeta?.buildings) ? mapMeta.buildings : [];

  let batch = db.batch();
  let ops = 0;
  let written = 0;

  async function commitIfFull() {
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  for (const b of buildings) {
    const tiles = iterBuildingTiles(b);
    if (!tiles.length) continue;

    const floors = Number.isFinite(b.floors) ? Math.max(1, Math.floor(b.floors)) : 1;
    const type = (b.type != null) ? String(b.type) : null;
    const districtId = Number.isFinite(b.districtId) ? Math.trunc(b.districtId) : 0;

    const rx = Number.isFinite(b?.root?.x) ? Math.trunc(b.root.x) : (tiles[0]?.x ?? 0);
    const ry = Number.isFinite(b?.root?.y) ? Math.trunc(b.root.y) : (tiles[0]?.y ?? 0);

    const name = (b.name != null) ? String(b.name) : null;

    const buildingStamp = {
      // No buildingId stored (by request)
      type,
      floors,
      districtId,
      name,
      root: { x: rx, y: ry },
    };

    const mx = derivedInsideMaxes(type);

    for (let z = 0; z < floors; z++) {
      for (const t of tiles) {
        const id = cellIdFor(t.x, t.y, z, 1);
        const ref = cellsCol.doc(id);

        batch.set(
          ref,
          {
            cellId: id,
            x: t.x,
            y: t.y,
            z,
            layer: 1,

            // Keep existing fields (used elsewhere)
            type,
            districtId,

            // Also store a “building stamp” for future navigation/grouping without mapMeta.
            // Runtime state remains PER-CELL (hp/fuse/water/search independent).
            building: buildingStamp,

            // IMPORTANT: no maxHp persisted; hp is current state (starts full)
            hp: mx.maxHp,
            ruined: false,

            // store ONLY hp; max is derived from config-game WORLD
            fuse: { hp: mx.fuseMax },
            water: { hp: mx.waterMax },
            generator: {
              installed: mx.generatorInstalledDefault,
              hp: mx.generatorMax,
            },

            // store ONLY remaining + searchedCount; maxRemaining is derived
            search: { remaining: mx.searchMax, searchedCount: 0 },

            createdAt: serverTs(),
            updatedAt: serverTs(),
          },
          { merge: true }
        );

        ops++;
        written++;
        await commitIfFull();
      }
    }
  }

  if (ops > 0) await batch.commit();
  return { written };
}

module.exports = {
  cellIdFor,
  parseCellId,
  ensureSearch,
  decrementSearch,
  derivedInsideMaxes,
  writeOutsideCells,
  writeInsideCells,
};