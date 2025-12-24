// ld2030/v1/tick/tickEngine.js
// Tick engine: advance world tickIndex, then players, then zombies.
// Tick constants come from ONE place: world/world-time.js

const makePlayerTicker = require('./tick-player');
const makeZombieTicker = require('./tick-zombies');
const { TICK_LEN_SECONDS, TICKS_PER_DAY } = require('../world/world-time');

function n(x, fallback = 0) {
  return (typeof x === 'number' && Number.isFinite(x)) ? x : fallback;
}

function makeTickEngine({ reader, writer }) {
  if (!reader) throw new Error('tick-engine: reader is required');
  if (!writer) throw new Error('tick-engine: writer is required');
  if (typeof reader.getGame !== 'function') throw new Error('tick-engine: reader.getGame is required');
  if (typeof writer.writeGameMeta !== 'function') throw new Error('tick-engine: writer.writeGameMeta is required');

  const playerTicker = makePlayerTicker({ reader, writer });
  const zombieTicker = makeZombieTicker({ reader, writer });

  async function tickGame({ gameId, now } = {}) {
    if (!gameId) throw new Error('tick-engine: gameId is required for tickGame');

    const game = await reader.getGame(gameId);
    const prevTickIndex = Number.isFinite(game?.tickIndex) ? Number(game.tickIndex) : 0;
    const tickIndex = prevTickIndex + 1;

    await writer.writeGameMeta(gameId, {
      tickIndex,
      tickLenSeconds: TICK_LEN_SECONDS,
      ticksPerDay: TICKS_PER_DAY,
      lastTickAt: now || new Date().toISOString(),
    });

    const playerResult = await playerTicker.tickPlayer({ gameId, now, tickIndex });
    const zombieResult = await zombieTicker.tickZombies({ gameId, now });

    const playersUpdated = n(playerResult?.playersUpdated, 0);
    const zombiesMoved   = n(zombieResult?.zombiesMoved, n(zombieResult?.updated, 0));
    const zombiesTotal   = n(zombieResult?.zombiesTotal, n(zombieResult?.total, 0));

    return {
      ok: true,
      gameId,
      tickIndex,
      tickLenSeconds: TICK_LEN_SECONDS,
      ticksPerDay: TICKS_PER_DAY,
      playersUpdated,
      zombiesMoved,
      zombiesTotal,
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

module.exports = { makeTickEngine };