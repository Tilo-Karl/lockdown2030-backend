// ld2030/v1/engine/integrity.js
// Single source of truth for integrity labels (UI + visibility).
// NEVER use this for passability. Passability is separate rules (door: isOpen || hp<=0).

function integrityLabel({ hp, maxHp }) {
  const h = Number(hp);
  const m = Number(maxHp);

  if (!Number.isFinite(h) || !Number.isFinite(m) || m <= 0) return null;

  if (h <= 0) return 'destroyed';

  const r = h / m;

  if (r <= 0.33) return 'almost_destroyed';
  if (r <= 0.66) return 'broken';
  if (r < 1.0) return 'damaged';

  return null; // pristine
}

module.exports = { integrityLabel };