// ld2030/v1/tick/tick-player.js
// Per-player tick logic (AP regen, etc.) used by the TickEngine.


const { TICK } = require('../config');
const { resolveEntityConfig } = require('../entity');

// Resolve player combat/regeneration defaults from unified entity config
const PLAYER_CONFIG = resolveEntityConfig('PLAYER', 'DEFAULT') || {};
const PLAYER = {
  START_HP: PLAYER_CONFIG.baseHp ?? PLAYER_CONFIG.maxHp ?? 100,
  MAX_HP: PLAYER_CONFIG.maxHp ?? PLAYER_CONFIG.baseHp ?? 100,
  START_AP: PLAYER_CONFIG.startAp ?? PLAYER_CONFIG.maxAp ?? 3,
  MAX_AP: PLAYER_CONFIG.maxAp ?? PLAYER_CONFIG.startAp ?? 3,
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
  const maxAp = Number.isFinite(PLAYER.MAX_AP) ? Number(PLAYER.MAX_AP) : Number(PLAYER.START_AP ?? 3);
  const hpRegen = Number(TICK?.PLAYER?.HP_REGEN_PER_TICK ?? 1);
  const maxHp = Number.isFinite(PLAYER.MAX_HP) ? Number(PLAYER.MAX_HP) : Number(PLAYER.START_HP ?? 100);

  /**
   * Apply one tick of player logic for all players in a game.
   *
   * - Regens AP and HP for alive players up to MAX_AP and MAX_HP.
   * - Skips dead players (alive === false).
   *
   * @param {object} params
   * @param {string} params.gameId
   * @param {string} params.now - ISO string timestamp for update time
   * @returns {Promise<{ updated: number, total: number, playersUpdated: number, playersTotal: number }>}
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

      let patch = {};

      const curApRaw = data.ap;
      const curAp = Number.isFinite(curApRaw) ? Number(curApRaw) : Number(PLAYER?.START_AP ?? 0);

      if (apRegen > 0 && curAp < maxAp) {
        const nextAp = Math.min(maxAp, curAp + apRegen);
        if (nextAp !== curAp) {
          patch.ap = nextAp;
        }
      }

      const curHpRaw = data.hp;
      const curHp = Number.isFinite(curHpRaw) ? Number(curHpRaw) : Number(PLAYER?.START_HP ?? 0);

      if (hpRegen > 0 && curHp < maxHp) {
        const nextHp = Math.min(maxHp, curHp + hpRegen);
        if (nextHp !== curHp) {
          patch.hp = nextHp;
        }
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

  return {
    tickPlayer,
  };
}

module.exports = makePlayerTicker;
