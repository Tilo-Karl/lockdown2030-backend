// ld2030/v1/tick/tickEngine.js
// Tick engine: wires together player and zombie tick logic.

const makePlayerTicker = require('./tick-player');
const makeZombieTicker = require('./tick-zombies');

/**
 * Construct a TickEngine using the shared state reader + writer.
 *
 * We deliberately depend only on { reader, writer } here so we can
 * reuse the same plumbing that the core game engine uses.
 */
function makeTickEngine({ reader, writer }) {
  if (!reader) throw new Error('tick-engine: reader is required');
  if (!writer) throw new Error('tick-engine: writer is required');

  const playerTicker = makePlayerTicker({ reader, writer });
  const zombieTicker = makeZombieTicker({ reader, writer });

  /**
   * Orchestrate a full game tick: players first, then zombies.
   * Expected shape: { gameId, now? }
   * Returns a summary of what changed.
   */
  async function tickGame({ gameId, now } = {}) {
    if (!gameId) {
      throw new Error('tick-engine: gameId is required for tickGame');
    }

    // Run player tick (AP/HP, round++, etc.)
    const playerResult = await playerTicker.tickPlayer({ gameId, now });

    // Run zombie tick (movement, attacks, etc.)
    const zombieResult = await zombieTicker.tickZombies({ gameId, now });

    const playersUpdated =
      playerResult && typeof playerResult.playersUpdated === 'number'
        ? playerResult.playersUpdated
        : 0;

    const zombiesMoved =
      zombieResult && typeof zombieResult.zombiesMoved === 'number'
        ? zombieResult.zombiesMoved
        : 0;

    const zombiesTotal =
      zombieResult && typeof zombieResult.zombiesTotal === 'number'
        ? zombieResult.zombiesTotal
        : 0;

    return {
      ok: true,
      gameId,
      playersUpdated,
      zombiesMoved,
      zombiesTotal,
    };
  }

  return {
    /**
     * Advance a single player's state by one tick.
     * Expected shape: { gameId, uid, now? }
     */
    tickPlayer: playerTicker.tickPlayer,

    /**
     * Advance zombies for a game by one tick.
     * Expected shape: { gameId, now? }
     */
    tickZombies: zombieTicker.tickZombies,

    /**
     * Full game tick (players + zombies) with a compact summary.
     */
    tickGame,
  };
}

module.exports = {
  makeTickEngine,
};