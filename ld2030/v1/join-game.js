// ld2030/v1/join-game.js
// POST /api/ld2030/v1/join-game
//
// JOIN RULE (DEV-FRIENDLY):
// - If player doc exists and has valid pos: DO NOT MODIFY IT. Just return it.
// - If player doc exists but pos is missing/invalid: write ONLY pos (+ updatedAt).
// - If player doc does not exist: create from FINAL HUMAN_PLAYER template,
//   and override ONLY spawn-only fields (userId/displayName/isPlayer/pos/timestamps).
//
// No clamping. No caps. No "ensureRuntimeFields". No silent HP/AP resets.

const { GRID } = require('./config');
const { resolveEntityConfig } = require('./entity');
const makeTx = require('./engine/tx');

const PLAYER_CFG = resolveEntityConfig('HUMAN', 'PLAYER');
if (!PLAYER_CFG || typeof PLAYER_CFG !== 'object') throw new Error('PLAYER_CFG_missing');

module.exports = function registerJoinGame(app, { db, admin, state, base }) {
  if (!app) throw new Error('join-game: app is required');
  if (!db) throw new Error('join-game: db is required');
  if (!admin) throw new Error('join-game: admin is required');
  if (!state) throw new Error('join-game: state is required');

  const BASE = base || '/api/ld2030/v1';
  const txHelpers = makeTx({ db, admin });
  const { run, serverTs, setWithUpdatedAt } = txHelpers;

  function gameRef(gameId) {
    return (state && typeof state.gameRef === 'function')
      ? state.gameRef(gameId)
      : db.collection('games').doc(String(gameId));
  }

  function cellsCol(gameId) {
    if (state && typeof state.cellsCol === 'function') return state.cellsCol(gameId);
    return gameRef(gameId).collection('cells');
  }

  function metaLogsRef(gameId) {
    return gameRef(gameId).collection('meta').doc('logs');
  }

  function cellIdFor(x, y, z, layer) {
    return `c_${x}_${y}_${z}_${layer}`;
  }

  function isValidLayer(v) {
    return Number.isInteger(v) && (v === 0 || v === 1);
  }

  function hasValidPos(pos) {
    return (
      pos &&
      Number.isInteger(pos.x) &&
      Number.isInteger(pos.y) &&
      Number.isInteger(pos.z) &&
      isValidLayer(pos.layer)
    );
  }

  function clampNum(n, min, max, fallback) {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(Math.max(Math.trunc(v), min), max);
  }

  function isSpawnLocked(cell, nowMs, ttlMs) {
    const lock = cell && typeof cell.spawnLock === 'object' ? cell.spawnLock : null;
    if (!lock) return false;

    if (Number.isFinite(lock.atMs)) {
      const age = nowMs - lock.atMs;
      return age >= 0 && age <= ttlMs;
    }

    const at = lock.at;
    const atMs = at && typeof at.toMillis === 'function' ? at.toMillis() : null;
    if (!Number.isFinite(atMs)) return false;

    const age = nowMs - atMs;
    return age >= 0 && age <= ttlMs;
  }

  async function pickSpawnCellTx(tx, gameId, w, h, uid) {
    const tries = 80;
    const ttlMs = 30_000;
    const nowMs = Date.now();
    const col = cellsCol(gameId);

    for (let i = 0; i < tries; i++) {
      const x = Math.floor(Math.random() * w);
      const y = Math.floor(Math.random() * h);

      const id = cellIdFor(x, y, 0, 0); // outside
      const ref = col.doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) continue;

      const cell = snap.data() || {};
      if (cell.blocksMove === true) continue;
      if (isSpawnLocked(cell, nowMs, ttlMs)) continue;

      setWithUpdatedAt(tx, ref, {
        spawnLock: {
          uid: String(uid),
          atMs: nowMs,
          at: serverTs(),
        },
      });

      return { x, y, z: 0, layer: 0 };
    }

    // hard fallback
    const fallback = { x: 0, y: 0, z: 0, layer: 0 };
    const fref = col.doc(cellIdFor(0, 0, 0, 0));
    const fsnap = await tx.get(fref);
    if (fsnap.exists) {
      setWithUpdatedAt(tx, fref, {
        spawnLock: { uid: String(uid), atMs: Date.now(), at: serverTs() },
      });
    }
    return fallback;
  }

  app.post(`${BASE}/join-game`, async (req, res) => {
    try {
      const body = req.body || {};
      const gameId = String(body.gameId || 'lockdown2030');
      const uid = String(body.uid || '').trim();
      const displayName = body.displayName;

      if (!uid) return res.status(400).json({ ok: false, reason: 'missing_uid' });

      const out = await run('joinGame', async (tx) => {
        const gRef = gameRef(gameId);
        const gSnap = await tx.get(gRef);
        if (!gSnap.exists) throw new Error('game_not_found');

        const g = gSnap.data() || {};
        const w = clampNum(g.gridsize?.w ?? g.w, GRID.MIN_W, GRID.MAX_W, GRID.DEFAULT_W);
        const h = clampNum(g.gridsize?.h ?? g.h, GRID.MIN_H, GRID.MAX_H, GRID.DEFAULT_H);

        const pRef = state.playersCol(gameId).doc(String(uid));
        const pSnap = await tx.get(pRef);

        // Existing player: DO NOT TOUCH stats.
        if (pSnap.exists) {
          const p = pSnap.data() || {};
          if (hasValidPos(p.pos)) {
            // optional: log join
            setWithUpdatedAt(tx, metaLogsRef(gameId), { lastJoinAt: serverTs() });

            return {
              x: p.pos.x,
              y: p.pos.y,
              z: p.pos.z,
              layer: p.pos.layer,
              maxHp: p.maxHp ?? null,
              maxAp: p.maxAp ?? null,
              currentHp: p.currentHp ?? null,
              currentAp: p.currentAp ?? null,
            };
          }

          // Has doc but invalid/missing pos: write ONLY pos (+ updatedAt).
          const spawn = await pickSpawnCellTx(tx, gameId, w, h, uid);
          setWithUpdatedAt(tx, pRef, { pos: spawn });

          setWithUpdatedAt(tx, metaLogsRef(gameId), { lastJoinAt: serverTs() });

          const p2 = (pSnap.data && typeof pSnap.data === 'function') ? (pSnap.data() || {}) : (p || {});
          return {
            x: spawn.x,
            y: spawn.y,
            z: spawn.z,
            layer: spawn.layer,
            maxHp: p2.maxHp ?? null,
            maxAp: p2.maxAp ?? null,
            currentHp: p2.currentHp ?? null,
            currentAp: p2.currentAp ?? null,
          };
        }

        // New player: create from FINAL template, override ONLY spawn-only fields.
        const spawn = await pickSpawnCellTx(tx, gameId, w, h, uid);

        const payload = {
          ...PLAYER_CFG,

          // identity/runtime for this player
          userId: String(uid),
          displayName: displayName ?? PLAYER_CFG.displayName ?? 'Player',
          type: 'HUMAN',
          kind: 'PLAYER',
          isPlayer: true,

          // spawn-only
          pos: spawn,

          createdAt: serverTs(),
          updatedAt: serverTs(),
        };

        tx.set(pRef, payload);

        setWithUpdatedAt(tx, metaLogsRef(gameId), { lastJoinAt: serverTs() });

        return {
          x: payload.pos.x,
          y: payload.pos.y,
          z: payload.pos.z,
          layer: payload.pos.layer,
          maxHp: payload.maxHp ?? null,
          maxAp: payload.maxAp ?? null,
          currentHp: payload.currentHp ?? null,
          currentAp: payload.currentAp ?? null,
        };
      });

      return res.json({ ok: true, ...out });
    } catch (err) {
      console.error('join error:', err);
      return res.status(400).json({ ok: false, reason: err?.message || 'error' });
    }
  });
};