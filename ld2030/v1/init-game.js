// ld2030/v1/init-game.js
// Mounts POST /api/ld2030/v1/init-game
// Big Bang V1: after writing mapMeta blueprint, initialize runtime world:
// - games/{gameId}.tickIndex clock
// - cells/* (outside + inside floors)
// - edges/* (doors + stairs)
// - districtState/*

const { GRID, MAP } = require('./config');

const { initWorldTimeDoc } = require('./world/world-time');
const { cellIdFor, writeOutsideCells, writeInsideCells } = require('./world/cells');
const { writeDoorEdges, writeStairsEdges } = require('./world/edges');
const { writeDistrictStates } = require('./world/district-state');

module.exports = function registerInitGame(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  app.post(`${BASE}/init-game`, async (req, res) => {
    try {
      const {
        gameId = 'lockdown2030',
        mapId  = MAP.DEFAULT_ID,
        w      = undefined,
        h      = undefined,
        seed   = Math.floor(Date.now() % 1_000_000_000),
        force  = false,
      } = req.body || {};

      // Decide final grid size
      let width;
      let height;

      if (typeof w === 'number' && typeof h === 'number') {
        width = w;
        height = h;
      } else if (GRID.USE_RANDOM && typeof GRID.randomSize === 'function') {
        const pick = GRID.randomSize();
        width = pick.w;
        height = pick.h;
      } else {
        width = GRID.DEFAULT_W;
        height = GRID.DEFAULT_H;
      }

      if (!gameId || !mapId) {
        return res.status(400).json({ ok: false, error: 'missing_ids' });
      }

      if (
        width < GRID.MIN_W || height < GRID.MIN_H ||
        width > GRID.MAX_W || height > GRID.MAX_H
      ) {
        return res.status(400).json({ ok: false, error: 'invalid_size' });
      }

      // 1) Write blueprint (mapMeta) via your existing state helper (allowed)
      // NOTE: state.writeMapAndGame expects `_force`, not `force`.
      await state.writeMapAndGame({
        gameId,
        mapId,
        w: width,
        h: height,
        seed,
        _force: force,
      });

      // 2) Load the freshly written mapMeta from game doc
      const gameRef = (state && typeof state.gameRef === 'function')
        ? state.gameRef(gameId)
        : db.collection('games').doc(gameId);

      const gSnap = await gameRef.get();
      if (!gSnap.exists) {
        return res.status(500).json({ ok: false, error: 'game_missing_after_init' });
      }

      const game = gSnap.data() || {};
      const mapMeta = game.mapMeta || null;
      if (!mapMeta) {
        return res.status(500).json({ ok: false, error: 'mapMeta_missing_after_init' });
      }

      // 3) Write world time clock to games/{gameId}
      await gameRef.set(
        {
          ...initWorldTimeDoc(),
          worldStartAt: serverTs(),
          updatedAt: serverTs(),
        },
        { merge: true }
      );

      // 4) Runtime collections
      const cellsCol = gameRef.collection('cells');
      const edgesCol = gameRef.collection('edges');
      const districtStateCol = gameRef.collection('districtState');

      // 5) Cells (outside + inside floors)
      const outside = await writeOutsideCells({
        db,
        admin,
        cellsCol,
        w: width,
        h: height,
        mapMeta,
      });

      const inside = await writeInsideCells({
        db,
        admin,
        cellsCol,
        mapMeta,
      });

      // 6) Edges (doors + stairs)
      const doors = await writeDoorEdges({
        db,
        admin,
        edgesCol,
        mapMeta,
      });

      const stairs = await writeStairsEdges({
        db,
        admin,
        edgesCol,
        mapMeta,
      });

      // 7) districtState (utilities + facility cell ids)
      const districts = await writeDistrictStates({
        db,
        admin,
        districtStateCol,
        mapMeta,
        cellIdFor,
      });

      console.log(
        `[init-game] '${gameId}' initialized (${width}x${height}) mapId=${mapId} ` +
        `cells(out=${outside.written}, in=${inside.written}) edges(door=${doors.written}, stairs=${stairs.written}) ` +
        `districtState=${districts.written}`
      );

      return res.json({
        ok: true,
        gameId,
        mapId,
        w: width,
        h: height,
        seed,
        runtime: {
          cellsOutside: outside.written,
          cellsInside: inside.written,
          edgesDoors: doors.written,
          edgesStairs: stairs.written,
          districtState: districts.written,
        },
      });

    } catch (e) {
      // Always return real error details for debugging.
      console.error('init-game error', e);
      return res.status(500).json({
        ok: false,
        error: 'internal',
        name: String(e?.name || ''),
        message: String(e?.message || e),
        stack: String(e?.stack || ''),
      });
    }
  });
};