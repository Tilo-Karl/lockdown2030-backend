// ld2030/v1/actions/ap-service.js
// Tiny wrapper so handlers import ONE thing for AP costs.

const { AP, apCostFor } = require('./ap-costs');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function ensureActorHasAp(actor, apCost, tag) {
  const cost = Math.max(0, nInt(apCost, 0));
  const curAp = nInt(actor?.currentAp, 0);

  if (actor?.isPlayer === true && curAp < cost) {
    throw new Error(`${tag}: not_enough_ap`);
  }

  const nextAp = (actor?.isPlayer === true) ? Math.max(0, curAp - cost) : curAp;
  return { apCost: cost, curAp, nextAp };
}

module.exports = {
  AP,
  apCostFor,
  ensureActorHasAp,
};