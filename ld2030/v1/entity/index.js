// ld2030/v1/entity/index.js
// Public entrypoint for entity templates + config resolution.

// Bases
const baseEntity = require('./base-entity');
const baseActor  = require('./base-actor');
const baseItem   = require('./base-item');

// Templates (raw)
const humans  = require('./humans/human');
const zombies = require('./zombies/zombie');
const items   = require('./items/item');
const weapons = require('./items/weapon');
const armor   = require('./items/armor');

// Resolution plumbing
const { resolveEntityKey, resolveEntityKeyFlexible } = require('./resolver');
const { getEntityConfig, getEntityConfigOrThrow, ENTITY_CONFIG } = require('./registry');

/**
 * Resolve a template config by (type, kind).
 * This is the ONLY supported way to map runtime docs -> template defaults.
 * Returns null if unknown.
 */
function resolveEntityConfig(type, kind) {
  const key = resolveEntityKey(type, kind);
  if (!key) return null;
  return getEntityConfig(key);
}

/**
 * Flexible resolver:
 * - (type, kind)
 * - ({type, kind})
 * - (registryKey)
 */
function resolveEntityConfigFlexible(a, b) {
  const key = resolveEntityKeyFlexible(a, b);
  if (!key) return null;
  return getEntityConfig(key);
}

module.exports = {
  // bases
  ...baseEntity,
  ...baseActor,
  ...baseItem,

  // templates (raw exports; useful for tests/tools)
  ...humans,
  ...zombies,
  ...items,
  ...weapons,
  ...armor,

  // registry (optional but handy)
  ENTITY_CONFIG,
  getEntityConfig,
  getEntityConfigOrThrow,

  // resolver (pure key mapping)
  resolveEntityKey,
  resolveEntityKeyFlexible,

  // main API used by engine/spawn/tick
  resolveEntityConfig,
  resolveEntityConfigFlexible,
};