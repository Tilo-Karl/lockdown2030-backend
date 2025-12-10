// ld2030/v1/tick/tick-zombies.js
// Per-tick zombie updates (placeholder version).
// Later this will handle movement, aggro, attacks, etc.

const { TICK } = require('../config');
const { resolveEntityConfig } = require('../entity');

function makeZombieTicker({ reader, writer }) {
  if (!reader) throw new Error('zombie-ticker: reader is required');
  if (!writer) throw new Error('zombie-ticker: writer is required');

  /**
   * Run one zombie tick for a given game.
   *
   * For now this is intentionally minimal:
   * - Reads all zombies for the game
   * - Counts total + alive
   * - Returns stats without mutating Firestore
   *
   * Later we’ll:
   * - Move zombies based on TICK.ZOMBIE settings
   * - Make them attack nearby players
   * - Write back new positions / HP via writer.*
   */
  async function tickZombies({ gameId = 'lockdown2030', now } = {}) {
    const col = reader.zombiesCol(gameId);
    if (!col) {
      return { updated: 0, total: 0, alive: 0 };
    }

    // Read the actual grid size for this game so zombies don’t walk off the map
    let width = null;
    let height = null;
    if (typeof reader.readGridSize === 'function') {
      try {
        const { w, h } = await reader.readGridSize(gameId, { w: 12, h: 12 });
        width = w;
        height = h;
      } catch (e) {
        console.error('tick-zombies: readGridSize error', e);
      }
    }

    const snap = await col.get();
    const docs = snap.docs || [];

    let total = 0;
    let alive = 0;
    let moved = 0;

    for (const doc of docs) {
      total += 1;
      const z = doc.data() || {};

      const baseCfg = resolveEntityConfig('ZOMBIE', z.kind || 'WALKER') || {};

      if (z.alive === false) {
        continue;
      }

      alive += 1;

      const pos = z.pos || {};
      const x = typeof pos.x === 'number' ? pos.x : 0;
      const y = typeof pos.y === 'number' ? pos.y : 0;

      // Movement: use config roam distance if provided, else fallback to random step
      const roam = typeof baseCfg.maxRoamDistance === 'number' ? baseCfg.maxRoamDistance : 1;

      // Generate candidate moves: stay + 4 dirs
      const dirs = [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      // Choose a movement limited by roam
      const choice = dirs[Math.floor(Math.random() * dirs.length)];
      let newX = x + Math.max(-roam, Math.min(choice.dx, roam));
      let newY = y + Math.max(-roam, Math.min(choice.dy, roam));

      if (Number.isFinite(width) && Number.isFinite(height)) {
        newX = Math.max(0, Math.min(width - 1, newX));
        newY = Math.max(0, Math.min(height - 1, newY));
      }

      // Only count as moved if the position actually changed
      if (newX !== x || newY !== y) {
        moved += 1;
      }

      // Persist the new position via the shared state writer
      await writer.updateZombie(gameId, doc.id, {
        pos: {
          x: newX,
          y: newY,
        },
        updatedAt: now || new Date().toISOString(),
      });
    }

    return {
      // number of zombies we actually changed this tick
      updated: moved,
      total,
      alive,
      zombiesMoved: moved,
      zombiesTotal: total,
      // included so future logic can tune behaviour per tick without changing API shape
      tickConfig: TICK?.ZOMBIE || null,
    };
  }

  return {
    tickZombies,
  };
}

module.exports = makeZombieTicker;