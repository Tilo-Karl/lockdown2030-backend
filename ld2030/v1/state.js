// ld2030/v1/state.js — Firestore helpers + init writes
const { generateMap } = require('./map-gen');

module.exports = function makeState(db, admin) {
  const gameRef    = (gameId) => db.collection('games').doc(gameId);
  const playersCol = (gameId) => gameRef(gameId).collection('players');

  /**
   * Create/overwrite the map (only if missing or force=true) and stamp game meta.
   */
  async function writeMapAndGame({
    gameId,
    mapId,
    w,
    h,
    seed,
    force = false,
  }) {
    if (!gameId || !mapId) throw new Error('missing_ids');
    if (!(Number.isInteger(w) && Number.isInteger(h))) throw new Error('invalid_size');
    if (w < 4 || h < 4 || w > 256 || h > 256) throw new Error('invalid_size');

    const gRef = gameRef(gameId);

    const mapDoc = generateMap({ seed, w, h });

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
        mapMeta: mapMeta ? {
          version: mapMeta.version,
          lab: mapMeta.lab || null,
          center: mapMeta.center || null,
          terrain: mapMeta.terrain || null,
          // Never write undefined into Firestore; use null if absent.
          passableChars: mapMeta.passableChars ?? null,
          params: mapMeta.params ?? null,
          buildings: mapMeta.buildings || [],
          buildingPalette: mapMeta.buildingPalette || null,
        } : admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
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
    writeMapAndGame,
    readGridSize,
  };
};