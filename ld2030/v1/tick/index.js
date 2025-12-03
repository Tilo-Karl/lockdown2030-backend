

// ld2030/v1/tick/index.js
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
  };
}

module.exports = {
  makeTickEngine,
};