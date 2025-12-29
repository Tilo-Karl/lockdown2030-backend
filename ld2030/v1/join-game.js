// ld2030/v1/join-game.js
// Mounts POST /api/ld2030/v1/join-game
//
// Big Bang schema (LOCKED):
// - players docs are ACTORs (from entity templates)
// - pos is ALWAYS { x, y, z, layer }
// - inside/outside is represented by layer (0=outside, 1=inside)
// - join must ensure must-always-exist runtime fields exist
// - if player doc already exists, keep its runtime state when valid
//
// FIXES:
// - Spawn lock uses spawnLock.atMs (number) so tx-safe (no toMillis on FieldValue)
// - Rejoin does NOT overwrite runtime/derived stats with template (fills missing only)
// - Logs are written under games/{gameId}/meta/logs (not players collection)

const { GRID } = require('./config');
const { PLAYER: PLAYER_DEFAULTS } = require('./config/config-game');
const { resolveEntityConfig } = require('./entity');
const makeTx = require('./engine/tx');

// Template is single source of truth for missing fields + caps baseline
const PLAYER_CFG = resolveEntityConfig('HUMAN', 'PLAYER');
if (!PLAYER_CFG || typeof PLAYER_CFG !== 'object') throw new Error('PLAYER_CFG_missing');
if (PLAYER_CFG.maxHp == null || PLAYER_CFG.maxAp == null) throw new Error('PLAYER_CFG_missing_caps');

module.exports = function registerJoinGame(app, { db, admin, state, base }) {
  const BASE = base || '/api/ld2030/v1';
  const txHelpers = makeTx({ db, admin });
  const { run, serverTs, setWithMeta, setWithUpdatedAt } = txHelpers;

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

  function isPlainObj(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  // Fill missing fields from template WITHOUT overwriting existing values.
  function deepFillMissing(target, src) {
    const out = isPlainObj(target) ? { ...target } : {};
    const s = isPlainObj(src) ? src : {};
    for (const [k, v] of Object.entries(s)) {
      const cur = out[k];
      if (cur == null) {
        out[k] = v;
      } else if (isPlainObj(cur) && isPlainObj(v)) {
        out[k] = deepFillMissing(cur, v);
      }
      // arrays + primitives: keep existing
    }
    return out;
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

  function clampPos(pos, w, h) {
    return {
      x: Math.min(Math.max(pos.x, 0), w - 1),
      y: Math.min(Math.max(pos.y, 0), h - 1),
      z: Math.max(0, Math.trunc(pos.z)),
      layer: pos.layer, // already validated
    };
  }

  function clampNum(n, min, max, fallback) {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(Math.max(Math.trunc(v), min), max);
  }

  function ensureRuntimeFields(existing, caps) {
    const p = existing && typeof existing === 'object' ? existing : {};

    const hungerDefault = PLAYER_DEFAULTS.START_HUNGER;
    const hydrationDefault = PLAYER_DEFAULTS.START_HYDRATION;
    const stressDefault = PLAYER_DEFAULTS.START_STRESS;
    const isDownedDefault = PLAYER_DEFAULTS.START_IS_DOWNED;
    const downedAtDefault = PLAYER_DEFAULTS.START_DOWNED_AT;

    const curHpRaw = Number.isFinite(p.currentHp) ? p.currentHp : caps.maxHp;
    const curApRaw = Number.isFinite(p.currentAp) ? p.currentAp : caps.maxAp;

    return {
      alive: p.alive !== false,

      // keep if present; clamp to [0..cap] (does NOT heal to full)
      currentHp: Math.min(Math.max(0, curHpRaw), caps.maxHp),
      currentAp: Math.min(Math.max(0, curApRaw), caps.maxAp),

      hunger: Number.isFinite(p.hunger) ? p.hunger : hungerDefault,
      hydration: Number.isFinite(p.hydration) ? p.hydration : hydrationDefault,
      stress: Number.isFinite(p.stress) ? p.stress : stressDefault,

      isDowned: (p.isDowned === true) ? true : (isDownedDefault === true),
      downedAt: (p.downedAt != null) ? p.downedAt : downedAtDefault,

      // services assume array
      inventory: Array.isArray(p.inventory) ? p.inventory : [],
    };
  }

  function isSpawnLocked(cell, nowMs, ttlMs) {
    const lock = cell && typeof cell.spawnLock === 'object' ? cell.spawnLock : null;
    if (!lock) return false;

    // New format: atMs number
    if (Number.isFinite(lock.atMs)) {
      const age = nowMs - lock.atMs;
      return age >= 0 && age <= ttlMs;
    }

    // Back-compat: Timestamp
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

    // Fallback: (0,0) outside
    const fallback = { x: 0, y: 0, z: 0, layer: 0 };
    const fid = cellIdFor(0, 0, 0, 0);
    const fref = col.doc(fid);
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
      const { gameId = 'lockdown2030', uid, displayName } = req.body || {};
      if (!gameId || !uid) return res.status(400).json({ ok: false, reason: 'missing_fields' });

      const result = await run('joinGame', async (tx) => {
        const gRef = gameRef(gameId);
        const gDoc = await tx.get(gRef);
        if (!gDoc.exists) throw new Error('game_not_found');

        const g = gDoc.data() || {};
        const w = clampNum(g.gridsize?.w ?? g.w, GRID.MIN_W, GRID.MAX_W, GRID.DEFAULT_W);
        const h = clampNum(g.gridsize?.h ?? g.h, GRID.MIN_H, GRID.MAX_H, GRID.DEFAULT_H);

        // Caps baseline from template (used only for clamping currentHp/currentAp)
        // NOTE: maxHp/maxAp on doc may be higher via equipment bonuses; we do NOT reduce them here.
        const caps = { maxHp: PLAYER_CFG.maxHp, maxAp: PLAYER_CFG.maxAp };

        const pRef = state.playersCol(gameId).doc(String(uid));
        const pDoc = await tx.get(pRef);

        if (pDoc.exists) {
          const p = pDoc.data() || {};

          if (p.alive !== false && hasValidPos(p.pos)) {
            const clampedPos = clampPos(p.pos, w, h);

            // Start from existing doc, fill missing keys from template ONLY.
            const merged = deepFillMissing(p, PLAYER_CFG);

            // Ensure required runtime fields exist (but do not reset derived stats)
            const runtime = ensureRuntimeFields(merged, caps);

            const patch = {
              ...merged,

              // Canonical identity
              userId: String(uid),
              displayName: displayName ?? merged.displayName ?? 'Player',

              type: 'HUMAN',
              kind: 'PLAYER',
              isPlayer: true,

              pos: clampedPos,

              ...runtime,
            };
            setWithMeta(tx, pRef, patch, pDoc);

            // Join log under game meta (NOT players collection)
            setWithUpdatedAt(tx, metaLogsRef(gameId), { lastJoinAt: serverTs() });

            return {
              x: clampedPos.x,
              y: clampedPos.y,
              z: clampedPos.z,
              layer: clampedPos.layer,
              maxHp: patch.maxHp ?? null,
              maxAp: patch.maxAp ?? null,
              currentHp: patch.currentHp,
              currentAp: patch.currentAp,
            };
          }
        }

        // Fresh spawn (or invalid legacy doc)
        const spawn = await pickSpawnCellTx(tx, gameId, w, h, uid);

        // Fill from template, then set required identity/runtime.
        const baseDoc = deepFillMissing({}, PLAYER_CFG);
        const runtime = ensureRuntimeFields({}, { maxHp: PLAYER_CFG.maxHp, maxAp: PLAYER_CFG.maxAp });

        const payload = {
          ...baseDoc,

          userId: String(uid),
          displayName: displayName ?? 'Player',

          type: 'HUMAN',
          kind: 'PLAYER',
          isPlayer: true,

          pos: { x: spawn.x, y: spawn.y, z: 0, layer: 0 },

          ...runtime,
        };
        setWithMeta(tx, pRef, payload, pDoc);

        // Join log under game meta (NOT players collection)
        setWithUpdatedAt(tx, metaLogsRef(gameId), { lastJoinAt: serverTs() });

        return {
          x: payload.pos.x,
          y: payload.pos.y,
          z: payload.pos.z,
          layer: payload.pos.layer,
          maxHp: payload.maxHp ?? null,
          maxAp: payload.maxAp ?? null,
          currentHp: payload.currentHp,
          currentAp: payload.currentAp,
        };
      });

      console.log(`[join] Player ${uid} joined game ${gameId}`);
      return res.json({ ok: true, ...result });
    } catch (err) {
      console.error('join error:', err);
      return res.status(400).json({ ok: false, reason: err.message || 'error' });
    }
  });
};
