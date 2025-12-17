// ld2030/v1/tick/tick-zombies.js
// Per-tick zombie updates.
// Keep zombies outside for now; always write full pos {x,y,z:0} + isInsideBuilding:false.

const { TICK } = require('../config');
const { resolveEntityKey } = require('../entity/resolver');
const { getEntityConfigOrThrow } = require('../entity/registry');

function makeZombieTicker({ reader, writer }) {
  if (!reader) throw new Error('zombie-ticker: reader is required');
  if (!writer) throw new Error('zombie-ticker: writer is required');

  async function tickZombies({ gameId = 'lockdown2030', now } = {}) {
    const col = reader.zombiesCol(gameId);
    if (!col) return { updated: 0, total: 0, alive: 0 };

    let width = 12;
    let height = 12;
    if (typeof reader.readGridSize === 'function') {
      const { w, h } = await reader.readGridSize(gameId, { w: 12, h: 12 });
      width = Number.isFinite(w) ? w : 12;
      height = Number.isFinite(h) ? h : 12;
    }

    const snap = await col.get();
    const docs = snap.docs || [];

    let total = 0;
    let alive = 0;
    let moved = 0;

    const roamDefault = Number(TICK?.ZOMBIE?.ROAM ?? 1);

    for (const doc of docs) {
      total += 1;
      const z = doc.data() || {};

      if (!z.pos || typeof z.pos.x !== 'number' || typeof z.pos.y !== 'number') continue;
      if (z.alive === false) continue;

      alive += 1;

      const kind = z.kind || 'WALKER';
      const key = resolveEntityKey('ZOMBIE', kind);
      if (!key) continue;

      const cfg = getEntityConfigOrThrow(key);

      const x = z.pos.x;
      const y = z.pos.y;

      const roam =
        Number.isFinite(cfg.maxRoamDistance) ? Number(cfg.maxRoamDistance) :
        Number.isFinite(roamDefault) ? roamDefault :
        1;

      const dirs = [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      const choice = dirs[Math.floor(Math.random() * dirs.length)];
      let newX = x + Math.max(-roam, Math.min(choice.dx, roam));
      let newY = y + Math.max(-roam, Math.min(choice.dy, roam));

      newX = Math.max(0, Math.min(width - 1, newX));
      newY = Math.max(0, Math.min(height - 1, newY));

      if (newX !== x || newY !== y) moved += 1;

      await writer.updateZombie(gameId, doc.id, {
        pos: { x: newX, y: newY, z: 0 },
        isInsideBuilding: false,
        updatedAt: now || new Date().toISOString(),
      });
    }

    return {
      updated: moved,
      total,
      alive,
      zombiesMoved: moved,
      zombiesTotal: total,
      tickConfig: TICK?.ZOMBIE || null,
    };
  }

  return { tickZombies };
}

module.exports = makeZombieTicker;