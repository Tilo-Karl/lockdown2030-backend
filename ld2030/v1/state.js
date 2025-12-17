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

  // NEW: per-tile/per-floor search state (shared world)
  const spotsCol   = (gameId) => gameRef(gameId).collection('spots');

  // NEW: doors per building tile
  const doorsCol   = (gameId) => gameRef(gameId).collection('doors');

  // Spawn writer uses the same collections
  const stateForSpawn = {
    gameRef,
    playersCol,
    zombiesCol,
    humansCol,
    itemsCol,
  };
  const spawnWriter = makeSpawnStateWriter({ db, admin, state: stateForSpawn });

  async function writeMapAndGame({
    gameId,
    mapId,
    w,
    h,
    seed,
    _force = false,
  }) {
    if (!gameId || !mapId) throw new Error('missing_ids');
    if (!(Number.isInteger(w) && Number.isInteger(h))) throw new Error('invalid_size');
    if (w < 4 || h < 4 || w > 256 || h > 256) throw new Error('invalid_size');

    const gRef = gameRef(gameId);

    const mapDoc = generateMap({ seed, w, h });

    const tileMetaForFirestore = {};
    if (TILE_META && typeof TILE_META === 'object') {
      Object.entries(TILE_META).forEach(([code, meta]) => {
        if (!meta) return;
        tileMetaForFirestore[code] = {
          label: meta.label || null,
          colorHex: meta.colorHex || null,
          blocksMovement: meta.blocksMovement === true,
          blocksVision: meta.blocksVision === true,
          playerSpawnAllowed: meta.playerSpawnAllowed !== false,
          zombieSpawnAllowed: meta.zombieSpawnAllowed !== false,
          moveCost: Number.isFinite(meta.moveCost) ? meta.moveCost : 1,
        };
      });
    }

    const batch = db.batch();
    const mapMeta = mapDoc ? mapDoc.meta : undefined;

    const mapMetaForSpawn = mapMeta
      ? { ...mapMeta, tileMeta: tileMetaForFirestore }
      : mapMeta;

    batch.set(
      gRef,
      {
        gameId,
        mapId,
        gridsize: { w, h },
        status: 'live',
        round: admin.firestore.FieldValue.increment(0) || 1,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        mapMeta: mapMeta
          ? {
              version: mapMeta.version,
              lab: mapMeta.lab || null,
              center: mapMeta.center || null,
              terrain: mapMeta.terrain || null,
              terrainPalette: mapMeta.terrainPalette || null,
              passableChars: mapMeta.passableChars ?? null,
              params: mapMeta.params ?? null,
              buildings: mapMeta.buildings || [],
              buildingPalette: mapMeta.buildingPalette || null,
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

    await spawnAllForNewGame({
      gameId,
      mapMeta: mapMetaForSpawn,
      spawnWriter,
    });
  }

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
    spotsCol,
    doorsCol, // ✅
    writeMapAndGame,
    readGridSize,
  };
};