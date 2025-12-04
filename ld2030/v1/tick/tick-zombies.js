// ld2030/v1/tick/tick-zombies.js
// Per-tick zombie updates (placeholder version).
// Later this will handle movement, aggro, attacks, etc.

const { TICK } = require('../config');

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

    const snap = await col.get();
    const docs = snap.docs || [];

    let total = 0;
    let alive = 0;
    let moved = 0;

    for (const doc of docs) {
      total += 1;
      const z = doc.data() || {};

      if (z.alive === false) {
        continue;
      }

      alive += 1;

      const pos = z.pos || {};
      const x = typeof pos.x === 'number' ? pos.x : 0;
      const y = typeof pos.y === 'number' ? pos.y : 0;

      // 4-directional random move (or stay put)
      const dirs = [
        { dx: 0, dy: 0 },  // stay
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      const choice = dirs[Math.floor(Math.random() * dirs.length)];
      const newX = x + choice.dx;
      const newY = y + choice.dy;

      if (choice.dx !== 0 || choice.dy !== 0) {
        moved += 1;
      }

      // Directly update the zombie document with the new position (pos.x / pos.y).
      await doc.ref.update({
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