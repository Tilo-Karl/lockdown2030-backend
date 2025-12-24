// ld2030/v1/engine/handlers/stand-handlers.js
// STAND_UP action handler (V1).
// - Purely actor state; no map/edges.
// - If already standing => no-op and apCost=0.

const { apCostFor } = require('../../actions/ap-costs');

function normStance(actor) {
  const s = String(actor?.stance || '').trim().toLowerCase();
  if (s) return s;
  if (actor?.isDown === true) return 'down';
  if (actor?.isProne === true) return 'prone';
  if (actor?.isCrawling === true) return 'crawling';
  return 'standing';
}

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function makeStandHandlers({ reader, writer } = {}) {
  if (!reader) throw new Error('stand-handlers: reader is required');
  if (!writer) throw new Error('stand-handlers: writer is required');

  async function handleStandUp({ gameId = 'lockdown2030', uid }) {
    const TAG = 'STAND_UP';
    if (!uid) throw new Error(`${TAG}: uid_required`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const cur = normStance(actor);
    if (cur === 'standing') {
      return { ok: true, gameId, uid, stance: 'standing', apCost: 0, currentAp: nInt(actor.currentAp, 0) };
    }

    const apCost = apCostFor('STAND_UP');
    const curAp = nInt(actor.currentAp, 0);

    if (actor.isPlayer === true && curAp < apCost) throw new Error(`${TAG}: not_enough_ap`);
    const nextAp = actor.isPlayer === true ? Math.max(0, curAp - apCost) : curAp;

    const patch = {
      stance: 'standing',
      isDown: false,
      isProne: false,
      isCrawling: false,
      ...(actor.isPlayer === true ? { currentAp: nextAp } : {}),
    };

    await writer.updateActor(gameId, uid, patch);

    return {
      ok: true,
      gameId,
      uid,
      stance: 'standing',
      apCost,
      ...(actor.isPlayer === true ? { currentAp: nextAp } : {}),
    };
  }

  return { handleStandUp };
}

module.exports = { makeStandHandlers };