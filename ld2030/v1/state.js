// ld2030/v1/state.js — Firestore helpers + init writes
const { generateMap } = require('./map-gen');
const { TILES, TILE_META } = require('./config');
const { ZOMBIE } = require('./config/config-game');
const makeSpawnStateWriter = require('./engine/state-writer-spawn');

module.exports = function makeState(db, admin) {
  const gameRef    = (gameId) => db.collection('games').doc(gameId);
  const playersCol = (gameId) => gameRef(gameId).collection('players');
  const zombiesCol = (gameId) => gameRef(gameId).collection('zombies');
  const npcsCol    = (gameId) => gameRef(gameId).collection('npcs');
  const itemsCol   = (gameId) => gameRef(gameId).collection('items');

  // Spawn writer uses the same collections
  const stateForSpawn = {
    gameRef,
    playersCol,
    zombiesCol,
    npcsCol,
    itemsCol,
  };
  const spawnWriter = makeSpawnStateWriter({ db, admin, state: stateForSpawn });

  /**
   * Create/overwrite the map (only if missing or force=true) and stamp game meta.
   * Also spawns zombies, human NPCs and items using the spawn writer.
   */
  async function writeMapAndGame({
    gameId,
    mapId,
    w,
    h,
    seed,
    // _force is reserved for a future "force re-init" behavior and is currently unused.
    _force = false,
  }) {
    if (!gameId || !mapId) throw new Error('missing_ids');
    if (!(Number.isInteger(w) && Number.isInteger(h))) throw new Error('invalid_size');
    if (w < 4 || h < 4 || w > 256 || h > 256) throw new Error('invalid_size');

    const gRef = gameRef(gameId);

    const mapDoc = generateMap({ seed, w, h });

    // Build a compact tile meta map for Firestore (label, color, movement flags, etc.)
    const tileMetaForFirestore = {};
    if (TILE_META && typeof TILE_META === 'object') {
      Object.entries(TILE_META).forEach(([code, meta]) => {
        if (!meta) return;
        tileMetaForFirestore[code] = {
          label: meta.label || null,
          colorHex: meta.colorHex || null,
          // Booleans default to false unless explicitly true
          blocksMovement: meta.blocksMovement === true,
          blocksVision: meta.blocksVision === true,
          // Spawns default to allowed unless explicitly false
          playerSpawnAllowed: meta.playerSpawnAllowed !== false,
          zombieSpawnAllowed: meta.zombieSpawnAllowed !== false,
          // Movement cost defaults to 1 if not set
          moveCost: Number.isFinite(meta.moveCost) ? meta.moveCost : 1,
        };
      });
    }

    const batch = db.batch();

    // Always (re)stamp game metadata so you see a change
    const mapMeta = mapDoc ? mapDoc.meta : undefined;
    batch.set(
      gRef,
      {
        gameId,
        mapId,
        gridsize: { w, h },
        status: 'live',
        // keep a round field present; increment(0) is a no-op write
        round: admin.firestore.FieldValue.increment(0) || 1,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        // small, optional mirror of map meta (handy for clients)
        mapMeta: mapMeta
          ? {
              version: mapMeta.version,
              lab: mapMeta.lab || null,
              center: mapMeta.center || null,
              terrain: mapMeta.terrain || null,
              terrainPalette: mapMeta.terrainPalette || null,
              // Never write undefined into Firestore; use null if absent.
              passableChars: mapMeta.passableChars ?? null,
              params: mapMeta.params ?? null,
              buildings: mapMeta.buildings || [],
              buildingPalette: mapMeta.buildingPalette || null,
              tileMeta: tileMetaForFirestore,
            }
          : admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    // --- Spawns (zombies + humans + items) -------------------------

    if (!mapMeta || !Array.isArray(mapMeta.terrain) || mapMeta.terrain.length === 0) {
      return; // nothing else we can do
    }

    const rows = mapMeta.terrain;
    const height = rows.length;
    const width = rows[0]?.length || 0;
    if (width <= 0 || height <= 0) return;

    const totalTiles = width * height;

    // ----- Zombies (same density as before) -----
    const density = typeof ZOMBIE?.DENSITY === 'number' ? ZOMBIE.DENSITY : 0.04;
    let desiredZombies = Math.floor(totalTiles * density);

    if (typeof ZOMBIE?.MIN === 'number') {
      desiredZombies = Math.max(desiredZombies, ZOMBIE.MIN);
    }
    if (typeof ZOMBIE?.MAX === 'number') {
      desiredZombies = Math.min(desiredZombies, ZOMBIE.MAX);
    }
    if (!Number.isFinite(desiredZombies) || desiredZombies < 1) {
      desiredZombies = 1;
    }

    const zombieSpawns = [];
    let safety = 0;
    let spawnedZ = 0;
    const maxTriesZ = desiredZombies * 30;

    while (spawnedZ < desiredZombies && safety < maxTriesZ) {
      safety += 1;

      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const row = rows[y];
      if (!row) continue;

      const ch = row.charAt(x);
      // Terrain codes from config (TILES):
      // ROAD, BUILD, CEMETERY, PARK, FOREST, WATER
      if (ch === TILES.WATER) {
        // No swimming zombies.
        continue;
      }

      zombieSpawns.push({ x, y, kind: 'WALKER' });
      spawnedZ += 1;
    }

    if (zombieSpawns.length > 0) {
      await spawnWriter.spawnZombies(gameId, zombieSpawns);
    }

    // ----- Human NPCs (very light density) -----
    const HUMAN_DENSITY = 0.01; // ~1% of tiles
    const HUMAN_MIN = 3;
    const HUMAN_MAX = 40;

    let desiredHumans = Math.floor(totalTiles * HUMAN_DENSITY);
    desiredHumans = Math.max(HUMAN_MIN, Math.min(HUMAN_MAX, desiredHumans));

    const humanSpawns = [];
    let humanSafety = 0;
    let spawnedH = 0;
    const maxTriesH = desiredHumans * 30;

    while (spawnedH < desiredHumans && humanSafety < maxTriesH) {
      humanSafety += 1;

      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const row = rows[y];
      if (!row) continue;

      const ch = row.charAt(x);
      if (ch === TILES.WATER) continue;

      humanSpawns.push({ x, y, kind: 'CIVILIAN' });
      spawnedH += 1;
    }

    if (humanSpawns.length > 0) {
      await spawnWriter.spawnHumanNpcs(gameId, humanSpawns);
    }

    // ----- Items (light scatter) -----
    const ITEM_DENSITY = 0.015; // ~1.5% of tiles
    const ITEM_MIN = 5;
    const ITEM_MAX = 60;

    let desiredItems = Math.floor(totalTiles * ITEM_DENSITY);
    desiredItems = Math.max(ITEM_MIN, Math.min(ITEM_MAX, desiredItems));

    const itemSpawns = [];
    let itemSafety = 0;
    let spawnedI = 0;
    const maxTriesI = desiredItems * 30;

    while (spawnedI < desiredItems && itemSafety < maxTriesI) {
      itemSafety += 1;

      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const row = rows[y];
      if (!row) continue;

      const ch = row.charAt(x);
      if (ch === TILES.WATER) continue;

      itemSpawns.push({ x, y, kind: 'GENERIC' });
      spawnedI += 1;
    }

    if (itemSpawns.length > 0) {
      await spawnWriter.spawnItems(gameId, itemSpawns);
    }
  }

  /**
   * Tiny helper: read game grid size (w,h). Safe default if missing.
   */
  async function readGridSize(gameId, fallback = { w: 32, h: 32 }) {
    const snap = await gameRef(gameId).get();
    if (!snap.exists) return fallback;
    const g = snap.data() || {};
    return {
      w: g.gridsize?.w ?? g.w ?? fallback.w,
      h: g.gridsize?.h ?? g.h ?? fallback.h,
    };
  }

  return {
    gameRef,
    playersCol,
    zombiesCol,
    npcsCol,
    itemsCol,
    writeMapAndGame,
    readGridSize,
  };
};