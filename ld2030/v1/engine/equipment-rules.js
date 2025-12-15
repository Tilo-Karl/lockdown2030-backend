// ld2030/v1/engine/equipment-rules.js
// Pure rules. No Firestore. No side effects.

function clone(obj) {
  // equipment is JSON-safe (strings + nulls + nested objects)
  return JSON.parse(JSON.stringify(obj || {}));
}

function getSlotNode(equipment, item) {
  const eq = equipment || {};
  const slot = String(item.slot || '').trim();
  const slotKey = String(item.slotKey || '').trim();

  if (!slot) return { ok: false, reason: 'missing_slot' };
  if (!slotKey) return { ok: false, reason: 'missing_slotKey' };

  if (!Object.prototype.hasOwnProperty.call(eq, slot)) {
    return { ok: false, reason: 'invalid_slot' };
  }

  const group = eq[slot];
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    return { ok: false, reason: 'invalid_slot_group' };
  }

  if (!Object.prototype.hasOwnProperty.call(group, slotKey)) {
    return { ok: false, reason: 'invalid_slotKey' };
  }

  return { ok: true, slot, slotKey, node: group[slotKey] };
}

function canEquip({ actor, item }) {
  if (!actor || !item) return { ok: false, reason: 'missing_actor_or_item' };
  if (!item.slot || !item.slotKey) return { ok: false, reason: 'item_not_equippable' };

  const slotInfo = getSlotNode(actor.equipment || {}, item);
  if (!slotInfo.ok) return slotInfo;

  const node = slotInfo.node;

  // Layered body parts: torso/legs use an object of layers
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const layer = String(item.layer || '').trim();
    if (!layer) return { ok: false, reason: 'missing_layer' };
    if (!Object.prototype.hasOwnProperty.call(node, layer)) return { ok: false, reason: 'invalid_layer' };
    if (node[layer] !== null) return { ok: false, reason: 'layer_occupied' };
    return { ok: true };
  }

  // Non-layered slots expect null when empty
  if (node !== null) return { ok: false, reason: 'slot_occupied' };

  return { ok: true };
}

function equip(actor, item, itemId) {
  const eq = clone(actor.equipment || {});
  const slot = String(item.slot || '').trim();
  const slotKey = String(item.slotKey || '').trim();

  if (!eq[slot] || typeof eq[slot] !== 'object') throw new Error('equip: invalid_slot');
  if (!Object.prototype.hasOwnProperty.call(eq[slot], slotKey)) throw new Error('equip: invalid_slotKey');

  const node = eq[slot][slotKey];
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const layer = String(item.layer || '').trim();
    if (!layer) throw new Error('equip: missing_layer');
    if (!Object.prototype.hasOwnProperty.call(node, layer)) throw new Error('equip: invalid_layer');
    node[layer] = itemId;
  } else {
    eq[slot][slotKey] = itemId;
  }

  return eq;
}

function unequip(actor, item) {
  const eq = clone(actor.equipment || {});
  const slot = String(item.slot || '').trim();
  const slotKey = String(item.slotKey || '').trim();

  if (!eq[slot] || typeof eq[slot] !== 'object') throw new Error('unequip: invalid_slot');
  if (!Object.prototype.hasOwnProperty.call(eq[slot], slotKey)) throw new Error('unequip: invalid_slotKey');

  const node = eq[slot][slotKey];
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    const layer = String(item.layer || '').trim();
    if (!layer) throw new Error('unequip: missing_layer');
    if (!Object.prototype.hasOwnProperty.call(node, layer)) throw new Error('unequip: invalid_layer');
    node[layer] = null;
  } else {
    eq[slot][slotKey] = null;
  }

  return eq;
}

function computeDerivedStats(equippedItems) {
  let armorBonus = 0;
  let maxHpBonus = 0;
  let moveApPenalty = 0;
  let carryBonus = 0;
  let hitChanceBonus = 0;

  let weapon = null;

  for (const item of equippedItems || []) {
    if (!item) continue;

    if (Number.isFinite(item.armor)) armorBonus += item.armor;
    if (Number.isFinite(item.hpBonus)) maxHpBonus += item.hpBonus;
    if (Number.isFinite(item.moveApPenalty)) moveApPenalty += item.moveApPenalty;
    if (Number.isFinite(item.carryBonus)) carryBonus += item.carryBonus;
    if (Number.isFinite(item.hitChanceBonus)) hitChanceBonus += item.hitChanceBonus;

    if (item.slot === 'weapon' && item.slotKey === 'main') weapon = item;
  }

  return {
    armorBonus,
    maxHpBonus,
    moveApPenalty,
    carryBonus,
    hitChanceBonus,
    weapon,
  };
}

module.exports = {
  canEquip,
  equip,
  unequip,
  computeDerivedStats,
};