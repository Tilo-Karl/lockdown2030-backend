// ld2030/v1/state.js — Firestore helpers + init writes
const { generateMap } = require('./map-gen');
const { TILE_META } = require('./config');
const makeSpawnStateWriter = require('./engine/state-writer-spawn');
const { spawnAllForNewGame } = require('./state-spawn');

module.exports = function makeState(db, admin) {
  const gameRef    = (gameId) => db.collection('games').doc(gameId);
  const playersCol = (gameId) => gameRef(gameId).collection('players');
  const zombiesCol = (gameId) => gameRef(gameId).collection('zombies');
  const humansCol  = (gameId) => gameRef(gameId).collection('humans');
  const itemsCol   = (gameId) => gameRef(gameId).collection('items');

  // Spawn writer uses the same collections
  const stateForSpawn = {
    gameRef,
    playersCol,
    zombiesCol,
    humansCol,
    itemsCol,
  };
  const spawnWriter = makeSpawnStateWriter({ db, admin, state: stateForSpawn });

  /**
   * Create/overwrite the map (only if missing or force=true) and stamp game meta.
   * Also spawns zombies, humans and items using the spawn writer.
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

    // IMPORTANT: the spawner reads from the in-memory mapMeta argument we pass in.
    // We inject tileMeta here so spawnAllForNewGame can use blocksMovement, etc.
    const mapMetaForSpawn = mapMeta
      ? {
          ...mapMeta,
          tileMeta: tileMetaForFirestore,
        }
      : mapMeta;

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
              // ✅ THIS is what makes mapMeta.tileMeta exist for the spawner
              tileMeta: tileMetaForFirestore,
              cityName: mapMeta.cityName || null,
              districts: mapMeta.districts || null,
            }
          : admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    // --- Spawns (zombies + humans + items) now live in state-spawn.js ---
    await spawnAllForNewGame({
      gameId,
      mapMeta: mapMetaForSpawn,
      spawnWriter,
    });
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
    humansCol,
    itemsCol,
    writeMapAndGame,
    readGridSize,
  };
};