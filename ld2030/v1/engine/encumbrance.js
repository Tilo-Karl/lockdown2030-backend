// ld2030/v1/engine/encumbrance.js
// Pure encumbrance logic. No Firestore.

function clampNum(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Encumbrance model (Quarantine 2019 style):
 * - encumbered if carryUsed > carryCap
 * - penalties are rules-level decisions (move +1, no water, no climb, etc.)
 */
function getEncumbrance(actor) {
  const used = clampNum(actor?.carryUsed, 0);
  const cap = Math.max(0, clampNum(actor?.carryCap, 0));

  const overBy = Math.max(0, used - cap);
  const ratio = cap > 0 ? used / cap : (used > 0 ? Infinity : 0);

  const encumbered = overBy > 0;

  // Level is optional; you can keep it simple for now.
  // 0 = ok, 1 = encumbered (over cap)
  const level = encumbered ? 1 : 0;

  return { used, cap, overBy, ratio, encumbered, level };
}

function isEncumbered(actor) {
  return getEncumbrance(actor).encumbered;
}

module.exports = {
  getEncumbrance,
  isEncumbered,
};