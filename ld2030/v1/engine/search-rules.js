// ld2030/v1/engine/search-rules.js
// Pure validation + “what spot am I searching?”
//
// IMPORTANT: Search is per (inside,x,y,z), not per buildingId.

function num(n, d = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
}

function planSearch({ game, actor }) {
  const pos = actor?.pos || {};
  const x = num(pos.x, 0);
  const y = num(pos.y, 0);
  const z = num(pos.z, 0);

  const inside = actor?.isInsideBuilding === true;

  // You required: must be inside to search.
  if (!inside) {
    return { ok: false, reason: 'must_be_inside_building' };
  }

  // (Optional later) could check tile is actually a building tile via mapMeta/building lookup.
  // For now, we trust the inside flag and position.

  return {
    ok: true,
    apCost: 1,
    spot: { inside: true, x, y, z },
  };
}

module.exports = { planSearch };