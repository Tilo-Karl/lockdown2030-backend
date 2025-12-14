// ld2030/v1/engine/equipment-rules.js
// Pure rules. No Firestore. No side effects.

function canEquip({ actor, item }) {
  if (!actor || !item) return { ok: false, reason: 'missing_actor_or_item' };
  if (!item.slot) return { ok: false, reason: 'item_not_equippable' };

  const eq = actor.equipment || {};

  // Slot exists?
  const slot = eq[item.slot];
  if (!slot) return { ok: false, reason: 'invalid_slot' };

  // Layered slots (body)
  if (typeof slot === 'object') {
    const layer = item.layer || 'base';
    if (slot[layer]) {
      return { ok: false, reason: 'layer_occupied' };
    }
    return { ok: true };
  }

  // Simple slot (weapon, head, hands, feet, tool, gear)
  if (slot !== null) {
    return { ok: false, reason: 'slot_occupied' };
  }

  return { ok: true };
}

function equip(actor, item, itemId) {
  const eq = structuredClone(actor.equipment || {});
  const slot = item.slot;

  if (typeof eq[slot] === 'object') {
    const layer = item.layer || 'base';
    eq[slot][layer] = itemId;
  } else {
    eq[slot] = itemId;
  }

  return eq;
}

function unequip(actor, item) {
  const eq = structuredClone(actor.equipment || {});
  const slot = item.slot;

  if (typeof eq[slot] === 'object') {
    const layer = item.layer || 'base';
    eq[slot][layer] = null;
  } else {
    eq[slot] = null;
  }

  return eq;
}

function computeDerivedStats(actor, equippedItems) {
  let armor = actor.armor ?? 0;
  let maxHpBonus = 0;
  let moveApPenalty = 0;
  let weapon = null;

  for (const item of equippedItems) {
    if (!item) continue;

    if (Number.isFinite(item.armor)) armor += item.armor;
    if (Number.isFinite(item.hpBonus)) maxHpBonus += item.hpBonus;
    if (Number.isFinite(item.moveApPenalty)) moveApPenalty += item.moveApPenalty;

    if (item.slot === 'weapon') weapon = item;
  }

  return {
    armor,
    maxHpBonus,
    moveApPenalty,
    weapon,
  };
}

module.exports = {
  canEquip,
  equip,
  unequip,
  computeDerivedStats,
};