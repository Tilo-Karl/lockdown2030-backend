// ld2030/v1/tick/tickEngine.js
// Tick engine: wires together player and zombie tick logic.

const makePlayerTicker = require('./tick-player');
const makeZombieTicker = require('./tick-zombies');

function n(x, fallback = 0) {
  return (typeof x === 'number' && Number.isFinite(x)) ? x : fallback;
}

/**
 * Construct a TickEngine using the shared state reader + writer.
 */
function makeTickEngine({ reader, writer }) {
  if (!reader) throw new Error('tick-engine: reader is required');
  if (!writer) throw new Error('tick-engine: writer is required');

  const playerTicker = makePlayerTicker({ reader, writer });
  const zombieTicker = makeZombieTicker({ reader, writer });

  /**
   * Orchestrate a full game tick: players first, then zombies.
   * Expected shape: { gameId, now? }
   * Returns a summary of what changed + full per-module breakdown.
   */
  async function tickGame({ gameId, now } = {}) {
    if (!gameId) throw new Error('tick-engine: gameId is required for tickGame');

    // Players first (AP/HP, round++, etc.)
    const playerResult = await playerTicker.tickPlayer({ gameId, now });

    // Then zombies (movement, doors/stairs hits, attacks, etc.)
    const zombieResult = await zombieTicker.tickZombies({ gameId, now });

    // Keep old compact fields for compatibility
    const playersUpdated = n(playerResult?.playersUpdated, 0);
    const zombiesMoved   = n(zombieResult?.zombiesMoved, n(zombieResult?.updated, 0));
    const zombiesTotal   = n(zombieResult?.zombiesTotal, n(zombieResult?.total, 0));

    return {
      ok: true,
      gameId,

      // Back-compat summary
      playersUpdated,
      zombiesMoved,
      zombiesTotal,

      // NEW: full breakdowns (so you can see doors/stairs/player hits without guessing)
      player: playerResult || null,
      zombies: zombieResult || null,
    };
  }

  return {
    tickPlayer: playerTicker.tickPlayer,
    tickZombies: zombieTicker.tickZombies,
    tickGame,
  };
}

module.exports = {
  makeTickEngine,
};