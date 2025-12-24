// ld2030/v1/entity/items/rules.js
// Item rules + tiny helpers (V1).

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function isStackable(tpl) {
  return tpl?.stackable === true && nInt(tpl.stackMax, 1) > 1;
}

function normalizeQuantity(tpl, qty) {
  const max = isStackable(tpl) ? Math.max(1, nInt(tpl.stackMax, 1)) : 1;
  return clamp(nInt(qty, 1), 1, max);
}

function canStackTogether(a, b) {
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;
  if (a.stackable !== true || b.stackable !== true) return false;
  return true;
}

function ammoKindForWeapon(weaponTpl) {
  if (!weaponTpl || weaponTpl.usesAmmo !== true) return null;
  const k = String(weaponTpl.ammoType || '').trim();
  return k || null;
}

function isAmmoItem(item) {
  const k = String(item?.kind || '');
  return k === 'BOLT' || k.startsWith('AMMO_');
}

function weaponAcceptsAmmo(weaponTpl, ammoItem) {
  const need = ammoKindForWeapon(weaponTpl);
  if (!need) return false;
  return String(ammoItem?.kind || '') === need;
}

function isLayeredSlotKey(slotKey) {
  const k = String(slotKey || '');
  return k === 'torso' || k === 'legs';
}

function validateTemplate(tpl, tag = 'ITEM_RULES') {
  if (!isObj(tpl)) throw new Error(`${tag}: template_invalid`);
  const kind = String(tpl.kind || '').trim();
  if (!kind) throw new Error(`${tag}: kind_required`);
  if (tpl.type !== 'ITEM') throw new Error(`${tag}: type_must_be_ITEM`);

  if (tpl.stackable === true && nInt(tpl.stackMax, 0) <= 1) {
    throw new Error(`${tag}: stackMax_invalid`);
  }

  if (tpl.layer != null && !isLayeredSlotKey(tpl.slotKey)) {
    throw new Error(`${tag}: layer_only_for_layered_slotKey`);
  }

  if (tpl.usesAmmo === true) {
    if (!ammoKindForWeapon(tpl)) throw new Error(`${tag}: ammoType_required`);
    if (nInt(tpl.ammoPerAttack, 0) <= 0) throw new Error(`${tag}: ammoPerAttack_invalid`);
  }

  return true;
}

function instantiate(tpl, overrides = {}) {
  validateTemplate(tpl);

  const base = {
    type: 'ITEM',
    kind: tpl.kind,
    name: tpl.name,
    description: tpl.description || '',
    tags: Array.isArray(tpl.tags) ? tpl.tags.slice() : [],

    weight: nInt(tpl.weight, 1),
    value: nInt(tpl.value, 0),

    stackable: tpl.stackable === true,
    stackMax: isStackable(tpl) ? nInt(tpl.stackMax, 1) : 1,
    quantity: normalizeQuantity(tpl, overrides.quantity ?? tpl.quantity ?? 1),

    carriedBy: overrides.carriedBy ?? null,

    slot: tpl.slot ?? null,
    slotKey: tpl.slotKey ?? null,
    layer: tpl.layer ?? null,

    durabilityMax: nInt(tpl.durabilityMax, 1),
    durability: clamp(nInt(overrides.durability ?? tpl.durabilityMax ?? 1, 1), 0, nInt(tpl.durabilityMax, 1)),
  };

  return { ...base, ...overrides, quantity: normalizeQuantity(tpl, overrides.quantity ?? base.quantity) };
}

module.exports = {
  isStackable,
  normalizeQuantity,
  canStackTogether,

  ammoKindForWeapon,
  isAmmoItem,
  weaponAcceptsAmmo,

  validateTemplate,
  instantiate,
};