// ld2030/v1/engine/equipment-service.js
// Orchestrates equip/unequip: reads docs, runs PURE rules, prepares a write plan,
// then asks the writer to apply it transactionally.
// No Firestore transactions here.

const {
  canEquip,
  equip,
  unequip,
  computeDerivedStats,
} = require('./equipment-rules');

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function isFiniteNum(x) {
  return Number.isFinite(x);
}

/**
 * Extract all equipped item ids from the actor.equipment shape.
 * Supports:
 * - equipment.weapon = { main, off } or string
 * - equipment.body = { under, outer } or { base, armor } (future-proof)
 * - equipment.head/hands/feet/tool/gear/back as string or null
 */
function listEquippedItemIds(equipment) {
  const eq = equipment || {};
  const ids = [];

  for (const [slot, value] of Object.entries(eq)) {
    if (!value) continue;

    if (typeof value === 'string') {
      ids.push(value);
      continue;
    }
    if (typeof value === 'object') {
      for (const v of Object.values(value)) {
        if (typeof v === 'string' && v) ids.push(v);
      }
    }
  }

  return uniq(ids);
}

/**
 * Compute carryUsed from inventory item docs and equipped item docs.
 * (If you later make stacks/qty, this is where it changes.)
 */
function computeCarryUsed({ actor, inventoryDocs, equippedDocs }) {
  const base = 0;

  const allItems = []
    .concat(Array.isArray(inventoryDocs) ? inventoryDocs : [])
    .concat(Array.isArray(equippedDocs) ? equippedDocs : []);

  let used = base;
  for (const it of allItems) {
    if (!it) continue;
    const w = it.weight;
    if (isFiniteNum(w) && w > 0) used += w;
  }

  // carryBonus from equipped backpacks etc can be applied later
  return used;
}

/**
 * Apply derived stats into a patch. Keep it minimal:
 * - armor, moveApCost, maxHp
 * - do NOT touch currentHp/currentAp here unless you decide a policy.
 */
function buildDerivedPatch({ actor, derived }) {
  const patch = {};

  // Armor: store as a derived field (overwriting actor.armor template base is OK if you treat it as derived-on-doc)
  if (isFiniteNum(derived.armor)) patch.armor = derived.armor;

  // Move AP penalty: simplest is to bump moveApCost (base + penalties)
  const baseMove = isFiniteNum(actor.moveApCost) ? actor.moveApCost : 1;
  const penalty = isFiniteNum(derived.moveApPenalty) ? derived.moveApPenalty : 0;
  patch.moveApCost = Math.max(0, baseMove + penalty);

  // HP bonus: bump maxHp. (policy: keep currentHp as-is; regen/heal handles it)
  const baseMaxHp = isFiniteNum(actor.maxHp) ? actor.maxHp : 1;
  const bonus = isFiniteNum(derived.maxHpBonus) ? derived.maxHpBonus : 0;
  patch.maxHp = Math.max(1, baseMaxHp + bonus);

  // Weapon: you can cache equipped weapon kind/id if you want, but avoid duplicating too much.
  // patch.weaponKind = derived.weapon?.kind ?? null

  return patch;
}

function makeEquipmentService({ reader, writer }) {
  if (!reader) throw new Error('equipment-service: reader is required');
  if (!writer) throw new Error('equipment-service: writer is required');

  async function equipItem({ gameId = 'lockdown2030', actorId, itemId }) {
    if (!actorId || !itemId) throw new Error('equipment-service.equipItem: missing_actorId_or_itemId');

    // Reads (non-transactional). Writer will re-validate in tx.
    const actor = await reader.getPlayer(gameId, actorId);
    const item = await reader.getItem(gameId, itemId);
    if (!actor || !item) throw new Error('equipment-service.equipItem: missing_actor_or_item');

    // Must be in inventory to equip (your rule). If you want ground-equip later, change here.
    const inv = Array.isArray(actor.inventory) ? actor.inventory : [];
    if (!inv.includes(itemId)) throw new Error('equipment-service.equipItem: item_not_in_inventory');

    const check = canEquip({ actor, item });
    if (!check.ok) throw new Error(`equipment-service.equipItem: ${check.reason}`);

    const newEquipment = equip(actor, item, itemId);

    // Preview equipped docs after the change so we can compute derived stats.
    const equippedIdsAfter = listEquippedItemIds(newEquipment);

    // Fetch docs (non-tx). Writer will optionally recompute in tx if you want paranoia.
    const equippedDocsAfter = await Promise.all(
      equippedIdsAfter.map((id) => reader.getItem(gameId, id))
    );

    const derived = computeDerivedStats(actor, equippedDocsAfter);

    // Inventory update: remove itemId from inventory when equipped
    const newInventory = inv.filter((id) => id !== itemId);

    // Carry used: inventory docs (after removal) + equipped docs (after equip)
    const inventoryDocsAfter = await Promise.all(
      uniq(newInventory).map((id) => reader.getItem(gameId, id))
    );
    const carryUsed = computeCarryUsed({
      actor,
      inventoryDocs: inventoryDocsAfter,
      equippedDocs: equippedDocsAfter,
    });

    const derivedPatch = buildDerivedPatch({ actor, derived });

    const patch = {
      equipment: newEquipment,
      inventory: newInventory,
      carryUsed,
      ...derivedPatch,
    };

    // Ask writer to apply transactionally (writer re-reads + validates)
    return writer.equipItem({ gameId, actorId, itemId, patch });
  }

  async function unequipItem({ gameId = 'lockdown2030', actorId, itemId }) {
    if (!actorId || !itemId) throw new Error('equipment-service.unequipItem: missing_actorId_or_itemId');

    const actor = await reader.getPlayer(gameId, actorId);
    const item = await reader.getItem(gameId, itemId);
    if (!actor || !item) throw new Error('equipment-service.unequipItem: missing_actor_or_item');

    // Must be currently equipped to unequip
    const equippedIds = listEquippedItemIds(actor.equipment);
    if (!equippedIds.includes(itemId)) throw new Error('equipment-service.unequipItem: item_not_equipped');

    const newEquipment = unequip(actor, item);

    // Inventory update: add itemId back
    const inv = Array.isArray(actor.inventory) ? actor.inventory : [];
    const newInventory = uniq(inv.concat([itemId]));

    // Equipped docs after unequip
    const equippedIdsAfter = listEquippedItemIds(newEquipment);
    const equippedDocsAfter = await Promise.all(
      equippedIdsAfter.map((id) => reader.getItem(gameId, id))
    );

    const derived = computeDerivedStats(actor, equippedDocsAfter);
    const inventoryDocsAfter = await Promise.all(
      uniq(newInventory).map((id) => reader.getItem(gameId, id))
    );

    const carryUsed = computeCarryUsed({
      actor,
      inventoryDocs: inventoryDocsAfter,
      equippedDocs: equippedDocsAfter,
    });

    const derivedPatch = buildDerivedPatch({ actor, derived });

    const patch = {
      equipment: newEquipment,
      inventory: newInventory,
      carryUsed,
      ...derivedPatch,
    };

    return writer.unequipItem({ gameId, actorId, itemId, patch });
  }

  return {
    equipItem,
    unequipItem,
  };
}

module.exports = { makeEquipmentService };