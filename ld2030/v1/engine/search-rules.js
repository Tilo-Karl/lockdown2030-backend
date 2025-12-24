// ld2030/v1/engine/search-rules.js
// Pure validation + “what spot am I searching?”
//
// MASTER PLAN (LOCKED):
// - actor.pos is ALWAYS { x, y, z, layer } where layer ∈ {0,1}
// - NO legacy fields / NO fallbacks (NO isInsideBuilding)

function nIntStrict(x, tag) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(tag);
  return Math.trunc(v);
}

function requirePos(actor, tag) {
  const p = actor?.pos;
  if (!p || typeof p !== 'object') throw new Error(`${tag}: missing_pos`);

  const x = nIntStrict(p.x, `${tag}: pos_x_invalid`);
  const y = nIntStrict(p.y, `${tag}: pos_y_invalid`);
  const z = nIntStrict(p.z, `${tag}: pos_z_invalid`);
  const layer = nIntStrict(p.layer, `${tag}: pos_layer_missing`);

  if (layer !== 0 && layer !== 1) throw new Error(`${tag}: pos_layer_invalid`);
  return { x, y, z, layer };
}

function planSearch({ actor }) {
  const TAG = 'SEARCH_RULES';

  const pos = requirePos(actor, TAG);

  // Must be inside to search (layer=1 is the truth)
  if (pos.layer !== 1) {
    return { ok: false, reason: 'must_be_inside_building' };
  }

  return {
    ok: true,
    apCost: 1,
    pos,
    spotId: `i_${pos.x}_${pos.y}_${pos.z}_${pos.layer}`,
  };
}

module.exports = { planSearch };