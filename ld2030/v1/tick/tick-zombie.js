// ld2030/v1/tick/tick-zombie.js
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
  async function tickZombies(gameId = 'lockdown2030') {
    const col = reader.zombiesCol(gameId);
    if (!col) {
      return { updated: 0, total: 0, alive: 0 };
    }

    const snap = await col.get();
    const docs = snap.docs || [];

    let total = 0;
    let alive = 0;

    for (const doc of docs) {
      total += 1;
      const z = doc.data() || {};
      if (z.alive !== false) {
        alive += 1;
      }
    }

    // No writes yet; purely informative.
    return {
      updated: 0,     // number of zombies we actually changed (0 for now)
      total,
      alive,
      // included so future logic can tune behaviour per tick without changing API shape
      tickConfig: TICK?.ZOMBIE || null,
    };
  }

  return {
    tickZombies,
  };
}

module.exports = makeZombieTicker;