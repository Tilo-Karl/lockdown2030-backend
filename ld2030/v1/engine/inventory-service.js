// ld2030/v1/engine/inventory-service.js
// Orchestrates pickup/drop: reads docs, computes patchActor + patchItem,
// then asks state-writer-inventory to apply transactionally.
// Also recomputes derived carry/encumbrance + moveApCost based on equipped items.

const { resolveEntityConfig } = require('../entity');
const { computeDerivedStats } = require('./equipment-rules');

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function isFiniteNum(x) {
  return Number.isFinite(x);
}

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function listEquippedItemIdsDeep(equipment) {
  const out = [];
  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string') { out.push(v); return; }
    if (typeof v === 'object' && !Array.isArray(v)) {
      for (const vv of Object.values(v)) walk(vv);
    }
  };
  walk(equipment || {});
  return uniq(out);
}

function computeCarryUsed({ inventoryDocs, equippedDocs }) {
  const allItems = []
    .concat(Array.isArray(inventoryDocs) ? inventoryDocs : [])
    .concat(Array.isArray(equippedDocs) ? equippedDocs : []);
  let used = 0;
  for (const it of allItems) {
    if (!it) continue;
    const w = it.weight;
    if (isFiniteNum(w) && w > 0) used += w;
  }
  return used;
}

function buildDerivedPatch({ actor, actorCfg, derived, carryUsed }) {
  const baseArmor = isFiniteNum(actorCfg.armor) ? actorCfg.armor : 0;
  const baseMove = isFiniteNum(actorCfg.moveApCost) ? actorCfg.moveApCost : 1;
  const baseMaxHp = isFiniteNum(actorCfg.maxHp) ? actorCfg.maxHp : 1;
  const baseCarry = isFiniteNum(actorCfg.carryCap) ? actorCfg.carryCap : 10;
  const baseHit = isFiniteNum(actorCfg.hitChance) ? actorCfg.hitChance : 0.8;
  const baseDmg = isFiniteNum(actorCfg.attackDamage) ? actorCfg.attackDamage : 1;
  const baseAp = isFiniteNum(actorCfg.attackApCost) ? actorCfg.attackApCost : 1;

  const armor = baseArmor + (isFiniteNum(derived.armorBonus) ? derived.armorBonus : 0);
  const maxHp = Math.max(1, baseMaxHp + (isFiniteNum(derived.maxHpBonus) ? derived.maxHpBonus : 0));

  const carryCap = Math.max(0, baseCarry + (isFiniteNum(derived.carryBonus) ? derived.carryBonus : 0));
  const over = Math.max(0, (isFiniteNum(carryUsed) ? carryUsed : 0) - carryCap);
  const encumbered = over > 0;

  const movePenalty =
    (isFiniteNum(derived.moveApPenalty) ? derived.moveApPenalty : 0) +
    (encumbered ? 1 : 0);

  const moveApCost = Math.max(0, baseMove + movePenalty);

  // Weapon-derived combat stats stay on actor doc too (so movement/AI can read it fast).
  let attackDamage = baseDmg;
  let attackApCost = baseAp;
  let hitChance = baseHit + (isFiniteNum(derived.hitChanceBonus) ? derived.hitChanceBonus : 0);

  if (derived.weapon) {
    if (isFiniteNum(derived.weapon.damage)) attackDamage = derived.weapon.damage;
    if (isFiniteNum(derived.weapon.attackApCost)) attackApCost = derived.weapon.attackApCost;
    if (isFiniteNum(derived.weapon.hitChanceBonus)) hitChance += derived.weapon.hitChanceBonus;
  }

  hitChance = clamp01(hitChance);

  const patch = {
    armor,
    maxHp,
    moveApCost,
    carryCap,
    carryUsed,
    encumbered,
    encumberedBy: over,
    attackDamage,
    attackApCost,
    hitChance,
  };

  if (isFiniteNum(actor.currentHp)) {
    patch.currentHp = Math.min(actor.currentHp, maxHp);
  }

  return patch;
}

function makeInventoryService({ reader, writer }) {
  if (!reader) throw new Error('inventory-service: reader is required');
  if (!writer) throw new Error('inventory-service: writer is required');

  async function pickupItem({ gameId = 'lockdown2030', actorId, itemId }) {
    const actor = await reader.getActor(gameId, actorId);
    const item = await reader.getItem(gameId, itemId);
    if (!actor || !item) throw new Error('inventory-service.pickupItem: missing_actor_or_item');

    const invNow = Array.isArray(actor.inventory) ? actor.inventory : [];
    if (invNow.includes(itemId)) throw new Error('inventory-service.pickupItem: already_in_inventory');

    // After pickup, inventory includes itemId
    const newInventory = uniq(invNow.concat([itemId]));

    const equippedIds = listEquippedItemIdsDeep(actor.equipment);
    const equippedDocs = (await Promise.all(equippedIds.map((id) => reader.getItem(gameId, id)))).filter(Boolean);

    const inventoryDocs = (await Promise.all(newInventory.map((id) => reader.getItem(gameId, id)))).filter(Boolean);

    const derived = computeDerivedStats(equippedDocs);
    const carryUsed = computeCarryUsed({ inventoryDocs, equippedDocs });

    const actorCfg =
      resolveEntityConfig(String(actor.type || '').toUpperCase(), String(actor.kind || '').toUpperCase()) || {};

    const derivedPatch = buildDerivedPatch({ actor, actorCfg, derived, carryUsed });

    const patchActor = {
      inventory: newInventory,
      ...derivedPatch,
    };

    const patchItem = {
      carriedBy: actorId,
      pos: null,
    };

    return writer.pickupItem({ gameId, actorId, itemId, patchActor, patchItem });
  }

  async function dropItem({ gameId = 'lockdown2030', actorId, itemId }) {
    const actor = await reader.getActor(gameId, actorId);
    const item = await reader.getItem(gameId, itemId);
    if (!actor || !item) throw new Error('inventory-service.dropItem: missing_actor_or_item');

    const invNow = Array.isArray(actor.inventory) ? actor.inventory : [];
    if (!invNow.includes(itemId)) throw new Error('inventory-service.dropItem: not_in_inventory');

    const newInventory = invNow.filter((id) => id !== itemId);

    const equippedIds = listEquippedItemIdsDeep(actor.equipment);
    if (equippedIds.includes(itemId)) throw new Error('inventory-service.dropItem: item_is_equipped');

    const equippedDocs = (await Promise.all(equippedIds.map((id) => reader.getItem(gameId, id)))).filter(Boolean);
    const inventoryDocs = (await Promise.all(uniq(newInventory).map((id) => reader.getItem(gameId, id)))).filter(Boolean);

    const derived = computeDerivedStats(equippedDocs);
    const carryUsed = computeCarryUsed({ inventoryDocs, equippedDocs });

    const actorCfg =
      resolveEntityConfig(String(actor.type || '').toUpperCase(), String(actor.kind || '').toUpperCase()) || {};

    const derivedPatch = buildDerivedPatch({ actor, actorCfg, derived, carryUsed });

    const patchActor = {
      inventory: newInventory,
      ...derivedPatch,
    };

    const patchItem = {
      carriedBy: null,
      pos: actor.pos, // Big Bang truth: must exist
    };

    return writer.dropItem({ gameId, actorId, itemId, patchActor, patchItem });
  }

  return {
    pickupItem,
    dropItem,
  };
}

module.exports = { makeInventoryService };