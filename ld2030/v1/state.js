// ld2030/v1/state.js — Firestore helpers + init writes
const { generateMap } = require('./map-gen');
const ZOMBIES = require('./npc/zombie-config');
const { TILES, TILE_META } = require('./config');
const { ZOMBIE } = require('./config/config-game');

module.exports = function makeState(db, admin) {
  const gameRef    = (gameId) => db.collection('games').doc(gameId);
  const playersCol = (gameId) => gameRef(gameId).collection('players');
  const zombiesCol = (gameId) => gameRef(gameId).collection('zombies');

  /**
   * Create/overwrite the map (only if missing or force=true) and stamp game meta.
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
          tileMeta: tileMetaForFirestore,
        } : admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    // --- Initial zombie spawn for this game ---
    // We only spawn if we have terrain data from the generated map.
    if (mapMeta && Array.isArray(mapMeta.terrain) && mapMeta.terrain.length > 0) {
      const zCol = zombiesCol(gameId);

      // Clear existing zombies for this game (fresh round)
      const existing = await zCol.get();
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
        const totalTiles = width * height;
        const density = typeof ZOMBIE?.DENSITY === 'number' ? ZOMBIE.DENSITY : 0.04;
        let desiredCount = Math.floor(totalTiles * density);

        if (typeof ZOMBIE?.MIN === 'number') {
          desiredCount = Math.max(desiredCount, ZOMBIE.MIN);
        }
        if (typeof ZOMBIE?.MAX === 'number') {
          desiredCount = Math.min(desiredCount, ZOMBIE.MAX);
        }
        if (!Number.isFinite(desiredCount) || desiredCount < 1) {
          desiredCount = 1;
        }

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
          // Terrain codes from config (TILES):
          // ROAD, BUILD, CEMETERY, PARK, FOREST, WATER
          if (ch === TILES.WATER) {
            // No swimming zombies.
            continue;
          }

          const tmpl = ZOMBIES.WALKER || {
            type: 'ZOMBIE',
            kind: 'walker',
            baseHp: 60,
          };

          const ref = zCol.doc();
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
    zombiesCol,
    writeMapAndGame,
    readGridSize,
  };
};