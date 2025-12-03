// ld2030/v1/tick/tick-player.js
// Per-player tick logic (AP regen, etc.) used by the TickEngine.

const { PLAYER, TICK } = require('../config');

/**
 * Factory for player tick logic.
 *
 * @param {object} deps
 * @param {object} deps.reader - State reader (must expose playersCol(gameId)).
 * @param {object} deps.writer - State writer (must expose updatePlayer(gameId, uid, data)).
 */
function makePlayerTicker({ reader, writer }) {
  if (!reader) throw new Error('makePlayerTicker: reader is required');
  if (!writer) throw new Error('makePlayerTicker: writer is required');

  const apRegen = Number(TICK?.PLAYER?.AP_REGEN_PER_TICK ?? 0);
  const maxAp = Number(PLAYER?.MAX_AP ?? PLAYER?.START_AP ?? 3);

  /**
   * Apply one tick of player logic for all players in a game.
   *
   * - Regens AP for alive players up to MAX_AP.
   * - Skips dead players (alive === false).
   *
   * @param {string} gameId
   * @returns {Promise<{ updated: number, total: number }>}
   */
  async function tickPlayers(gameId) {
    if (!gameId) throw new Error('tickPlayers: gameId is required');

    const col = reader.playersCol(gameId);
    const snap = await col.get();
    if (snap.empty) {
      return { updated: 0, total: 0 };
    }

    const updates = [];
    let updatedCount = 0;

    snap.forEach((doc) => {
      const uid = doc.id;
      const data = doc.data() || {};

      // Skip special docs like logs or metadata
      if (!uid || uid.startsWith('_')) return;

      const alive = data.alive !== false;
      if (!alive) return;

      const curApRaw = data.ap;
      const curAp = Number.isFinite(curApRaw) ? Number(curApRaw) : Number(PLAYER?.START_AP ?? 0);

      if (apRegen > 0 && curAp < maxAp) {
        const nextAp = Math.min(maxAp, curAp + apRegen);
        if (nextAp !== curAp) {
          updatedCount += 1;
          updates.push(
            writer.updatePlayer(gameId, uid, {
              ap: nextAp,
            })
          );
        }
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return { updated: updatedCount, total: snap.size };
  }

  return {
    tickPlayers,
  };
}

module.exports = makePlayerTicker;
