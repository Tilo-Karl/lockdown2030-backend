// ld2030/v1/tick/tick-zombies.js
// Per-tick zombie updates.
// Entity system only: uses (type='ZOMBIE', kind=...) -> registry key -> template.
// No legacy resolveEntityConfig, no baseHp/baseAp, no hp/ap fallbacks.

const { TICK } = require('../config');
const { resolveEntityKey } = require('../entity/resolver');
const { getEntityConfigOrThrow } = require('../entity/registry');

function makeZombieTicker({ reader, writer }) {
  if (!reader) throw new Error('zombie-ticker: reader is required');
  if (!writer) throw new Error('zombie-ticker: writer is required');

  async function tickZombies({ gameId = 'lockdown2030', now } = {}) {
    const col = reader.zombiesCol(gameId);
    if (!col) return { updated: 0, total: 0, alive: 0 };

    // Grid bounds (hard fail -> default 12x12)
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

      // Strict shape: zombies MUST have pos + kind.
      if (!z.pos || typeof z.pos.x !== 'number' || typeof z.pos.y !== 'number') continue;
      if (z.alive === false) continue;

      alive += 1;

      const kind = z.kind || 'WALKER';
      const key = resolveEntityKey('ZOMBIE', kind);
      if (!key) continue;

      const cfg = getEntityConfigOrThrow(key);

      const x = Number(z.pos.x);
      const y = Number(z.pos.y);

      const roam =
        Number.isFinite(cfg.maxRoamDistance) ? Number(cfg.maxRoamDistance) :
        Number.isFinite(roamDefault) ? roamDefault :
        1;

      // 0 = no move, otherwise move 1..roam tiles in one cardinal direction
      const dirs = [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      const choice = dirs[Math.floor(Math.random() * dirs.length)];
      const stepSize = (choice.dx === 0 && choice.dy === 0) ? 0 : Math.max(1, Math.floor(Math.random() * Math.max(1, roam)) + 1);

      let newX = x + choice.dx * stepSize;
      let newY = y + choice.dy * stepSize;

      newX = Math.max(0, Math.min(width - 1, newX));
      newY = Math.max(0, Math.min(height - 1, newY));

      if (newX !== x || newY !== y) moved += 1;

      // Zombies are outside-only for now: always keep z=0 and isInsideBuilding=false
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