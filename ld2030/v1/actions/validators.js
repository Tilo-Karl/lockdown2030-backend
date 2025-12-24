// ld2030/v1/actions/validators.js
// Shared strict validators (V1). No invented movement rules.
// Use these from handlers/services so behavior is consistent.

function nIntStrict(x, tag) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(tag);
  return Math.trunc(v);
}

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function requireUid(uid, tag = 'REQ') {
  const u = String(uid || '').trim();
  if (!u) throw new Error(`${tag}: uid_required`);
  return u;
}

function requireGameId(gameId, tag = 'REQ') {
  const g = String(gameId || '').trim();
  if (!g) throw new Error(`${tag}: gameId_required`);
  return g;
}

function requirePos(actor, tag = 'REQ') {
  const p = actor?.pos;
  if (!p || typeof p !== 'object') throw new Error(`${tag}: missing_pos`);

  const x = nIntStrict(p.x, `${tag}: pos_x_invalid`);
  const y = nIntStrict(p.y, `${tag}: pos_y_invalid`);
  const z = nIntStrict(p.z, `${tag}: pos_z_invalid`);
  const layer = nIntStrict(p.layer, `${tag}: pos_layer_invalid`);

  if (layer !== 0 && layer !== 1) throw new Error(`${tag}: pos_layer_invalid`);

  return { x, y, z, layer };
}

function requireInside(actor, tag = 'REQ') {
  const pos = requirePos(actor, tag);
  if (pos.layer !== 1) throw new Error(`${tag}: must_be_inside`);
  return pos;
}

function requireOutside(actor, tag = 'REQ') {
  const pos = requirePos(actor, tag);
  if (pos.layer !== 0) throw new Error(`${tag}: must_be_outside`);
  return pos;
}

function requireDzPlusMinus1(dz, tag = 'REQ') {
  const step = Number(dz);
  if (!Number.isFinite(step) || (step !== 1 && step !== -1)) {
    throw new Error(`${tag}: dz_must_be_plus_or_minus_1`);
  }
  return step;
}

function sameTile(a, b) {
  return (
    a &&
    b &&
    nInt(a.x, NaN) === nInt(b.x, NaN) &&
    nInt(a.y, NaN) === nInt(b.y, NaN) &&
    nInt(a.z, NaN) === nInt(b.z, NaN) &&
    nInt(a.layer, NaN) === nInt(b.layer, NaN)
  );
}

function requireSameTile(aPos, bPos, tag = 'REQ') {
  if (!sameTile(aPos, bPos)) throw new Error(`${tag}: must_be_same_tile`);
  return true;
}

function cellIdFor(x, y, z, layer) {
  return `c_${nInt(x)}_${nInt(y)}_${nInt(z)}_${nInt(layer)}`;
}

module.exports = {
  nIntStrict,
  nInt,
  requireUid,
  requireGameId,
  requirePos,
  requireInside,
  requireOutside,
  requireDzPlusMinus1,
  sameTile,
  requireSameTile,
  cellIdFor,
};