// ld2030/v1/tick/tick-player.js
// Per-player tick logic (AP regen, etc.) used by the TickEngine.

const { TICK } = require('../config');
const { resolveEntityKey } = require('../entity/resolver');
const { getEntityConfig } = require('../entity/registry');

// Resolve player defaults from entity system (type=HUMAN, kind=PLAYER)
const PLAYER_KEY = resolveEntityKey('HUMAN', 'PLAYER');
const PLAYER_TPL = (PLAYER_KEY && getEntityConfig(PLAYER_KEY)) || {};

const PLAYER = {
  // Templates define caps; runtime docs store currentHp/currentAp.
  MAX_HP: Number.isFinite(PLAYER_TPL.maxHp) ? Number(PLAYER_TPL.maxHp) : 100,
  MAX_AP: Number.isFinite(PLAYER_TPL.maxAp) ? Number(PLAYER_TPL.maxAp) : 3,

  // Starting values only used if current values are missing/invalid.
  START_HP: Number.isFinite(PLAYER_TPL.maxHp) ? Number(PLAYER_TPL.maxHp) : 100,
  START_AP: Number.isFinite(PLAYER_TPL.maxAp) ? Number(PLAYER_TPL.maxAp) : 3,
};

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

  const apRegen = Number(TICK?.PLAYER?.AP_REGEN_PER_TICK ?? 1);
  const maxAp = Number.isFinite(PLAYER.MAX_AP) ? Number(PLAYER.MAX_AP) : 3;

  const hpRegen = Number(TICK?.PLAYER?.HP_REGEN_PER_TICK ?? 1);
  const maxHp = Number.isFinite(PLAYER.MAX_HP) ? Number(PLAYER.MAX_HP) : 100;

  /**
   * Apply one tick of player logic for all players in a game.
   *
   * - Regens currentAp/currentHp for alive players up to MAX_AP and MAX_HP.
   * - Skips dead players (alive === false).
   */
  async function tickPlayer({ gameId = 'lockdown2030', now } = {}) {
    if (!gameId) throw new Error('tickPlayer: gameId is required');

    const col = reader.playersCol(gameId);
    const snap = await col.get();

    if (snap.empty) {
      return { updated: 0, total: 0, playersUpdated: 0, playersTotal: 0 };
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

      const patch = {};

      const curApRaw = data.currentAp;
      const curAp = Number.isFinite(curApRaw) ? Number(curApRaw) : Number(PLAYER.START_AP ?? 0);

      if (apRegen > 0 && curAp < maxAp) {
        const nextAp = Math.min(maxAp, curAp + apRegen);
        if (nextAp !== curAp) patch.currentAp = nextAp;
      }

      const curHpRaw = data.currentHp;
      const curHp = Number.isFinite(curHpRaw) ? Number(curHpRaw) : Number(PLAYER.START_HP ?? 0);

      if (hpRegen > 0 && curHp < maxHp) {
        const nextHp = Math.min(maxHp, curHp + hpRegen);
        if (nextHp !== curHp) patch.currentHp = nextHp;
      }

      if (Object.keys(patch).length > 0) {
        updatedCount += 1;
        updates.push(
          writer.updatePlayer(gameId, uid, {
            ...patch,
            updatedAt: now || new Date().toISOString(),
          })
        );
      }
    });

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return {
      updated: updatedCount,
      total: snap.size,
      playersUpdated: updatedCount,
      playersTotal: snap.size,
    };
  }

  return { tickPlayer };
}

module.exports = makePlayerTicker;