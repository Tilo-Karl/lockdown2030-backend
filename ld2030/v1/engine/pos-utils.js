// ld2030/v1/engine/pos-utils.js
// Shared position comparison helpers.

function normPos(pos) {
  if (!pos || typeof pos !== 'object') return null;
  return {
    x: Number(pos?.x),
    y: Number(pos?.y),
    z: Number(pos?.z),
    layer: Number(pos?.layer),
  };
}

function samePos(a, b) {
  const pa = normPos(a);
  const pb = normPos(b);
  if (!pa || !pb) return false;
  if (
    Number.isNaN(pa.x) || Number.isNaN(pa.y) || Number.isNaN(pa.z) || Number.isNaN(pa.layer) ||
    Number.isNaN(pb.x) || Number.isNaN(pb.y) || Number.isNaN(pb.z) || Number.isNaN(pb.layer)
  ) {
    return false;
  }
  return pa.x === pb.x && pa.y === pb.y && pa.z === pb.z && pa.layer === pb.layer;
}

module.exports = {
  normPos,
  samePos,
};
