// ld2030/v1/state.js — Firestore helpers + init writes
const { generateMap } = require('./map-gen');
const ZOMBIES = require('./npc/zombie-config');

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
          terrainPalette: mapMeta.terrainPalette || null,
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

    // --- Initial zombie spawn for this game ---
    // We only spawn if we have terrain data from the generated map.
    if (mapMeta && Array.isArray(mapMeta.terrain) && mapMeta.terrain.length > 0) {
      const zombiesCol = gRef.collection('zombies');

      // Clear existing zombies for this game (fresh round)
      const existing = await zombiesCol.get();
      if (!existing.empty) {
        const delBatch = db.batch();
        existing.forEach((doc) => delBatch.delete(doc.ref));
        await delBatch.commit();
      }

      const rows = mapMeta.terrain;
      const height = rows.length;
      const width = rows[0]?.length || 0;

      if (width > 0 && height > 0) {
        // Simple rule: zombies can spawn on any tile except WATER ("5").
        const desiredCount = Math.max(5, Math.floor((width * height) / 16));
        const batchZ = db.batch();

        let spawned = 0;
        let safety = 0;
        const maxTries = desiredCount * 30;

        while (spawned < desiredCount && safety < maxTries) {
          safety += 1;

          const x = Math.floor(Math.random() * width);
          const y = Math.floor(Math.random() * height);
          const row = rows[y];
          if (!row) continue;

          const ch = row.charAt(x);
          // Terrain codes from game-config:
          // 0 = ROAD, 1 = BUILD, 2 = CEMETERY, 3 = PARK, 4 = FOREST, 5 = WATER
          if (ch === '5') {
            // No swimming zombies.
            continue;
          }

          const tmpl = ZOMBIES.WALKER || {
            type: 'ZOMBIE',
            kind: 'walker',
            baseHp: 60,
          };

          const ref = zombiesCol.doc();
          batchZ.set(ref, {
            type: tmpl.type || 'ZOMBIE',
            kind: tmpl.kind || 'walker',
            hp: tmpl.baseHp ?? 60,
            alive: true,
            pos: { x, y },
            spawnedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          spawned += 1;
        }

        if (spawned > 0) {
          await batchZ.commit();
        }
      }
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
    writeMapAndGame,
    readGridSize,
  };
};