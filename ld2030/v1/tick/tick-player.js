// ld2030/v1/tick/tick-player.js
// Per-player tick logic (regen + meters + downed rules) used by the TickEngine.

const { TICK } = require('../config');
const { resolveEntityKey } = require('../entity/resolver');
const { getEntityConfig } = require('../entity/registry');

const PLAYER_KEY = resolveEntityKey('HUMAN', 'PLAYER');
const PLAYER_TPL = (PLAYER_KEY && getEntityConfig(PLAYER_KEY)) || {};

const PLAYER = {
  MAX_HP: Number.isFinite(PLAYER_TPL.maxHp) ? Number(PLAYER_TPL.maxHp) : 100,
  MAX_AP: Number.isFinite(PLAYER_TPL.maxAp) ? Number(PLAYER_TPL.maxAp) : 3,

  START_HP: Number.isFinite(PLAYER_TPL.maxHp) ? Number(PLAYER_TPL.maxHp) : 100,
  START_AP: Number.isFinite(PLAYER_TPL.maxAp) ? Number(PLAYER_TPL.maxAp) : 3,
};

function clampInt(v, lo, hi, fallback) {
  const x = Number(v);
  if (!Number.isFinite(x)) return fallback;
  const t = Math.trunc(x);
  return Math.max(lo, Math.min(hi, t));
}

function makePlayerTicker({ reader, writer }) {
  if (!reader) throw new Error('makePlayerTicker: reader is required');
  if (!writer) throw new Error('makePlayerTicker: writer is required');

  // Contracts (defaults match your Big Bang doc)
  const apRegen = Number.isFinite(Number(TICK?.PLAYER?.AP_REGEN_PER_TICK)) ? Number(TICK.PLAYER.AP_REGEN_PER_TICK) : 1;
  const hpRegen = Number.isFinite(Number(TICK?.PLAYER?.HP_REGEN_PER_TICK)) ? Number(TICK.PLAYER.HP_REGEN_PER_TICK) : 2;

  const maxAp = Number.isFinite(PLAYER.MAX_AP) ? Number(PLAYER.MAX_AP) : 3;
  const maxHp = Number.isFinite(PLAYER.MAX_HP) ? Number(PLAYER.MAX_HP) : 100;

  const DRAIN_EVERY = Number.isFinite(Number(TICK?.METERS?.DRAIN_EVERY_TICKS)) ? Number(TICK.METERS.DRAIN_EVERY_TICKS) : 72;
  const METER_MAX = 4;
  const STRESS_MAX = 4;

  async function tickPlayer({ gameId = 'lockdown2030', now, tickIndex } = {}) {
    if (!gameId) throw new Error('tickPlayer: gameId is required');

    const col = reader.playersCol(gameId);
    const snap = await col.get();

    if (snap.empty) {
      return { updated: 0, total: 0, playersUpdated: 0, playersTotal: 0 };
    }

    const doDrain = Number.isFinite(tickIndex) && tickIndex > 0 && (tickIndex % DRAIN_EVERY === 0);

    const updates = [];
    let updatedCount = 0;

    snap.forEach((doc) => {
      const uid = doc.id;
      const data = doc.data() || {};

      if (!uid || uid.startsWith('_')) return;
      if (data.alive === false) return;

      const patch = {};

      // --- AP regen (cap 3)
      const curAp = Number.isFinite(data.currentAp) ? Number(data.currentAp) : Number(PLAYER.START_AP ?? 0);
      if (apRegen > 0 && curAp < maxAp) {
        const nextAp = Math.min(maxAp, curAp + apRegen);
        if (nextAp !== curAp) patch.currentAp = nextAp;
      }

      // --- HP regen (cap 100) : contract says +2/tick
      const curHp = Number.isFinite(data.currentHp) ? Number(data.currentHp) : Number(PLAYER.START_HP ?? 0);
      if (hpRegen > 0 && curHp < maxHp) {
        const nextHp = Math.min(maxHp, curHp + hpRegen);
        if (nextHp !== curHp) patch.currentHp = nextHp;
      }

      // --- Downed rule (locked):
      // hp<=0 => isDowned=true, set downedAt once; NEVER auto-clear isDowned here.
      const hpForDownedCheck = Number.isFinite(patch.currentHp) ? Number(patch.currentHp) : curHp;
      const wasDowned = data.isDowned === true;

      if (hpForDownedCheck <= 0) {
        if (!wasDowned) {
          patch.isDowned = true;
          if (!data.downedAt) patch.downedAt = now || new Date().toISOString();
        }
      } else {
        if (wasDowned) {
          // stay downed until stand-up action (NO auto-stand)
        }
      }

      // --- Meters (locked v1):
      // Hunger/Hydration are 0..4; drain -1 every 72 ticks.
      let hunger = clampInt(data.hunger, 0, METER_MAX, METER_MAX);
      let hydration = clampInt(data.hydration, 0, METER_MAX, METER_MAX);
      let stress = clampInt(data.stress, 0, STRESS_MAX, 0);

      if (doDrain) {
        const nextHunger = Math.max(0, hunger - 1);
        const nextHydration = Math.max(0, hydration - 1);
        if (nextHunger !== hunger) patch.hunger = nextHunger;
        if (nextHydration !== hydration) patch.hydration = nextHydration;
        hunger = nextHunger;
        hydration = nextHydration;
      }

      // Stress maxes if either hunger or hydration is 0 (no death)
      const effectiveHunger = Number.isFinite(patch.hunger) ? patch.hunger : hunger;
      const effectiveHydration = Number.isFinite(patch.hydration) ? patch.hydration : hydration;

      if (effectiveHunger === 0 || effectiveHydration === 0) {
        if (stress !== STRESS_MAX) patch.stress = STRESS_MAX;
      }

      if (Object.keys(patch).length > 0) {
        updatedCount += 1;
        updates.push(writer.updatePlayer(gameId, uid, patch));
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
      tickIndex: Number.isFinite(tickIndex) ? tickIndex : null,
      didDrain: doDrain,
      drainEveryTicks: DRAIN_EVERY,
    };
  }

  return { tickPlayer };
}

module.exports = makePlayerTicker;