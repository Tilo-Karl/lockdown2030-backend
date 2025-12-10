// ld2030/v1/entity/index.js
// Single entry point for all entity configs.

const base = require('./config-entity');
const human = require('./entity-human');
const zombie = require('./entity-zombie');
const item = require('./entity-item');

// Unified registry so other code can look up configs by key.
const ENTITY_CONFIG = {
  // Actors
  PLAYER: human.PLAYER,
  HUMAN_CIVILIAN: human.HUMAN_CIVILIAN,
  ZOMBIE_WALKER: zombie.ZOMBIE_WALKER,

  // Items
  ITEM_GENERIC: item.ITEM_GENERIC,
  ITEM_WEAPON_GENERIC: item.ITEM_WEAPON_GENERIC,
  ITEM_ARMOR_GENERIC: item.ITEM_ARMOR_GENERIC,
};

/**
 * Look up a concrete entity config by registry key.
 * Returns null if the key is unknown.
 */
function getEntityConfig(key) {
  return ENTITY_CONFIG[key] || null;
}

/**
 * Look up a concrete entity config by registry key.
 * Throws a clear error if the key is unknown.
 */
function getEntityConfigOrThrow(key) {
  const cfg = ENTITY_CONFIG[key];
  if (!cfg) {
    throw new Error(`Unknown entity config key: ${key}`);
  }
  return cfg;
}

module.exports = {
  // Bases
  ...base,

  // Concrete entities
  ...human,
  ...zombie,
  ...item,

  // Registry
  ENTITY_CONFIG,
  getEntityConfig,
  getEntityConfigOrThrow,
};