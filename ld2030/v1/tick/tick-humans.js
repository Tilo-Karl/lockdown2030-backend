// ld2030/v1/tick/tick-humans.js
// NPC humans tick (raiders) — V1 scaffold.
//
// Purpose:
// - Give HUMAN NPCs (non-player) the same “can deal damage” capability as zombies,
//   by calling writer.attackEntity({ attackerId: humanId, targetId: playerId }).
// - Keep it simple + low-risk: no door/stairs damage here yet (that’s a separate add-on).
//
// NOTE:
// - This file does NOT change master-plan contracts; it’s an opt-in ticker.
// - Requires reader.humansCol + reader.playersCol + writer.updateHuman + writer.attackEntity.

const { clamp } = require('./zombie-utils');

function makeHumanTicker({ reader, writer, config } = {}) {
  if (!reader) throw new Error('human-ticker: reader is required');
  if (!writer) throw new Error('human-ticker: writer is required');

  if (typeof reader.getGame !== 'function') throw new Error('human-ticker: reader.getGame is required');
  if (typeof reader.readGridSize !== 'function') throw new Error('human-ticker: reader.readGridSize is required');

  if (typeof reader.humansCol !== 'function') throw new Error('human-ticker: reader.humansCol is required');
  if (typeof reader.playersCol !== 'function') throw new Error('human-ticker: reader.playersCol is required');

  if (typeof writer.updateHuman !== 'function') throw new Error('human-ticker: writer.updateHuman is required');
  if (typeof writer.attackEntity !== 'function') throw new Error('human-ticker: writer.attackEntity is required');

  // Minimal config (override via config arg if you want)
  const CFG = {
    ROAM: Number.isFinite(config?.ROAM) ? Number(config.ROAM) : 1,
    ATTACK_CHANCE: Number.isFinite(config?.ATTACK_CHANCE) ? Number(config.ATTACK_CHANCE) : 0.35,
    ATTACK_PLAYERS_OUTSIDE: config?.ATTACK_PLAYERS_OUTSIDE !== false, // default true
    ATTACK_PLAYERS_INSIDE: config?.ATTACK_PLAYERS_INSIDE !== false,   // default true
    ...config,
  };

  function dirs() {
    return [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
  }

  async function buildPlayersByPos({ gameId, width, height }) {
    const playersByPos = new Map();

    const pSnap = await reader.playersCol(gameId).get();
    const pDocs = pSnap.docs || [];

    for (const pDoc of pDocs) {
      const uid = pDoc.id;
      const p = pDoc.data() || {};
      if (!uid || uid.startsWith('_')) continue;

      // Skip “dead” players (your world uses alive/isDowned/etc; stay conservative)
      if (p.alive === false) continue;

      const pos = p.pos || null;
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') continue;

      const px = clamp(pos.x, 0, width - 1);
      const py = clamp(pos.y, 0, height - 1);

      // Big Bang truth: layer is authoritative
      const layer = Number.isFinite(pos.layer) ? Math.trunc(pos.layer) : 0;
      const inside = layer === 1;

      const pz = inside ? (Number.isFinite(pos.z) ? Math.trunc(pos.z) : 0) : 0;

      const key = `${px},${py},${pz},${inside ? 1 : 0}`;
      if (!playersByPos.has(key)) playersByPos.set(key, []);
      playersByPos.get(key).push(uid);
    }

    return playersByPos;
  }

  async function tickHumans({ gameId = 'lockdown2030', now } = {}) {
    const col = reader.humansCol(gameId);
    if (!col) return { updated: 0, total: 0, alive: 0 };

    const { w, h } = await reader.readGridSize(gameId, { w: 12, h: 12 });
    const width = Number.isFinite(w) ? Number(w) : 12;
    const height = Number.isFinite(h) ? Number(h) : 12;

    // Ensure game exists (matches other tickers)
    const game = await reader.getGame(gameId);
    if (!game) return { updated: 0, total: 0, alive: 0, error: 'game_not_found' };

    const playersByPos = await buildPlayersByPos({ gameId, width, height });

    const snap = await col.get();
    const docs = snap.docs || [];

    let total = 0;
    let alive = 0;
    let moved = 0;
    let playersHit = 0;

    for (const doc of docs) {
      total += 1;

      const hDoc = doc.data() || {};
      if (!hDoc.pos || typeof hDoc.pos.x !== 'number' || typeof hDoc.pos.y !== 'number') continue;

      // Conservative: if alive false, ignore
      if (hDoc.alive === false) continue;
      alive += 1;

      const id = doc.id;

      // Big Bang truth: use pos.layer, do NOT use isInsideBuilding
      const pos = hDoc.pos || {};
      const x = clamp(pos.x, 0, width - 1);
      const y = clamp(pos.y, 0, height - 1);

      const layer = Number.isFinite(pos.layer) ? Math.trunc(pos.layer) : 0;
      const inside = layer === 1;

      const z = inside ? (Number.isFinite(pos.z) ? Math.trunc(pos.z) : 0) : 0;

      // Attack first: if sharing tile with player, sometimes attack
      if (Math.random() < CFG.ATTACK_CHANCE) {
        if (inside && CFG.ATTACK_PLAYERS_INSIDE) {
          const key = `${x},${y},${z},1`;
          const targets = playersByPos.get(key);
          if (targets && targets.length) {
            playersHit += 1;
            await writer.attackEntity({ gameId, attackerId: id, targetId: targets[0] });
          }
        } else if (!inside && CFG.ATTACK_PLAYERS_OUTSIDE) {
          const key = `${x},${y},0,0`;
          const targets = playersByPos.get(key);
          if (targets && targets.length) {
            playersHit += 1;
            await writer.attackEntity({ gameId, attackerId: id, targetId: targets[0] });
          }
        }
      }

      // Roam (simple random walk). Keeps within same layer/z plane.
      const choice = dirs()[Math.floor(Math.random() * dirs().length)];
      const roam = Number.isFinite(CFG.ROAM) ? Math.max(0, Math.trunc(CFG.ROAM)) : 1;

      const stepX = Math.max(-roam, Math.min(choice.dx, roam));
      const stepY = Math.max(-roam, Math.min(choice.dy, roam));

      const nx = clamp(x + stepX, 0, width - 1);
      const ny = clamp(y + stepY, 0, height - 1);

      // NOTE: we do NOT validate cells/* here (keeps this file standalone).
      // If you want strict runtime truth, wire reader.getCell checks in a later pass.

      if (nx !== x || ny !== y) moved += 1;

      // Update pos (Big Bang shape) and updatedAt (if your writer sets it, ok; if not, harmless)
      await writer.updateHuman(gameId, id, {
        pos: { x: nx, y: ny, z, layer: inside ? 1 : 0 },
        updatedAt: now || new Date().toISOString(),
      });
    }

    return {
      updated: moved,
      total,
      alive,
      humansMoved: moved,
      humansTotal: total,
      playersHit,
    };
  }

  return { tickHumans };
}

module.exports = makeHumanTicker;