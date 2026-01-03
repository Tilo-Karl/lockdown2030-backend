// ld2030/v1/state.js — Firestore helpers + init writes (BLUEPRINT ONLY)
//
// Big Bang V1:
// - mapMeta is blueprint only (static)
// - runtime gameplay state lives in:
//   - cells/   (runtime truth)
//   - edges/   (runtime truth)
//   - districtState/ (runtime truth)
//   - noiseTiles/    (runtime truth)
//
// This module provides collection helpers and writes the blueprint mapMeta.
// Runtime init (cells/edges/districtState) is done in init-game.js.

const { generateMap } = require('./map-gen');
const { buildCellPalette } = require('./config/cell-palette');

const makeSpawnStateWriter = require('./engine/state-writer-spawn');

module.exports = function makeState(db, admin) {
  const gameRef    = (gameId) => db.collection('games').doc(String(gameId));

  const playersCol = (gameId) => gameRef(gameId).collection('players');
  const zombiesCol = (gameId) => gameRef(gameId).collection('zombies');
  const humansCol  = (gameId) => gameRef(gameId).collection('humans');
  const itemsCol   = (gameId) => gameRef(gameId).collection('items');

  // Big Bang runtime world
  const cellsCol         = (gameId) => gameRef(gameId).collection('cells');
  const edgesCol         = (gameId) => gameRef(gameId).collection('edges');
  const districtStateCol = (gameId) => gameRef(gameId).collection('districtState');
  const noiseTilesCol    = (gameId) => gameRef(gameId).collection('noiseTiles');

  // V1 bounded events feed
  const eventsCol        = (gameId) => gameRef(gameId).collection('events');
  const eventMetaDoc     = (gameId) => gameRef(gameId).collection('eventMeta').doc('feed');

  // Chat collections (per-scope bounded feeds)
  const chatMessagesCol = (gameId, scope) => {
    const s = String(scope || '').trim() || 'global';
    return gameRef(gameId).collection('chat').doc(s).collection('messages');
  };
  const chatMetaDoc = (gameId, scope) => {
    const s = String(scope || '').trim() || 'global';
    return gameRef(gameId).collection('chat').doc(s).collection('meta').doc('feed');
  };

  // Spawn writer uses the entity collections (not runtime world collections)
  const stateForSpawn = {
    gameRef,
    playersCol,
    zombiesCol,
    humansCol,
    itemsCol,
  };
  const spawnWriter = makeSpawnStateWriter({ db, admin, state: stateForSpawn });

  // Writes only blueprint mapMeta + game doc (no runtime cells/edges here).
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

    // Idempotency gate: if mapMeta already exists and not forcing, do nothing.
    if (!_force) {
      const existing = await gRef.get();
      if (existing.exists) {
        const g = existing.data() || {};
        if (g.mapMeta) return; // blueprint already written; do NOT respawn
      }
    }

    const mapDoc = generateMap({ seed, w, h });

    const batch = db.batch();
    const mapMeta = mapDoc ? mapDoc.meta : undefined;
    const cellPalette = buildCellPalette();

    batch.set(
      gRef,
      {
        gameId: String(gameId),
        mapId: String(mapId),
        gridsize: { w, h },
        status: 'live',
        round: 1,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),

        cellPalette,

        // Blueprint only. Runtime state is in cells/edges/districtState/noiseTiles.
        mapMeta: mapMeta
          ? {
              version: mapMeta.version,
              lab: mapMeta.lab || null,
              center: mapMeta.center || null,
              terrain: mapMeta.terrain || null,
              passableChars: mapMeta.passableChars ?? null,
              params: mapMeta.params ?? null,
              buildings: mapMeta.buildings || [],
              cityName: mapMeta.cityName || null,
              districts: mapMeta.districts || null,
            }
          : admin.firestore.FieldValue.delete(),

        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
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

    // entities
    playersCol,
    zombiesCol,
    humansCol,
    itemsCol,

    // runtime world
    cellsCol,
    edgesCol,
    districtStateCol,
    noiseTilesCol,

    // events feed
    eventsCol,
    eventMetaDoc,

    // chat feed
    chatCol: chatMessagesCol,
    chatMetaDoc,

    // blueprint init
    writeMapAndGame,

    readGridSize,
    spawnWriter,
  };
};
