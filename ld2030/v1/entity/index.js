// ld2030/v1/entity/index.js
// Single entry point for all entity configs.

const base   = require('./entity-base');
const human  = require('./entity-human');
const zombie = require('./entity-zombie');
const raider = require('./npc-raider');
const trader = require('./npc-trader');
const items  = require('./items/entity-item');

// Unified registry so other code can look up configs by key.
const ENTITY_CONFIG = {
  // Actors – players & humans
  PLAYER: human.PLAYER,
  HUMAN_CIVILIAN: human.HUMAN_CIVILIAN,
  HUMAN_RAIDER: raider.NPC_HUMAN_RAIDER,
  HUMAN_TRADER: trader.NPC_HUMAN_TRADER,

  // Zombies
  ZOMBIE_WALKER: zombie.ZOMBIE_WALKER,

  // Item bases
  ITEM_GENERIC: items.ITEM_GENERIC,
  ITEM_WEAPON_GENERIC: items.ITEM_WEAPON_GENERIC,
  ITEM_ARMOR_GENERIC: items.ITEM_ARMOR_GENERIC,

  // Concrete “building-flavoured” items
  ITEM_WEAPON_POLICE_PISTOL: items.ITEM_WEAPON_POLICE_PISTOL,
  ITEM_ARMOR_POLICE_VEST: items.ITEM_ARMOR_POLICE_VEST,
  ITEM_WEAPON_SHOP_KNIFE: items.ITEM_WEAPON_SHOP_KNIFE,
};

// Internal helper: map (type, kind) → concrete config.
function resolveByTypeKind(type, kind) {
  if (!type) return null;
  const upType = String(type).toUpperCase();
  const upKind = String(kind || 'DEFAULT').toUpperCase();

  if (upType === 'PLAYER') {
    return ENTITY_CONFIG.PLAYER;
  }

  if (upType === 'HUMAN') {
    if (upKind === 'CIVILIAN' || upKind === 'DEFAULT') return ENTITY_CONFIG.HUMAN_CIVILIAN;
    if (upKind === 'RAIDER') return ENTITY_CONFIG.HUMAN_RAIDER;
    if (upKind === 'TRADER') return ENTITY_CONFIG.HUMAN_TRADER;
  }

  if (upType === 'ZOMBIE') {
    if (upKind === 'WALKER' || upKind === 'DEFAULT') return ENTITY_CONFIG.ZOMBIE_WALKER;
  }

  if (upType === 'ITEM') {
    if (upKind === 'GENERIC' || upKind === 'DEFAULT') return ENTITY_CONFIG.ITEM_GENERIC;
    if (upKind === 'WEAPON' || upKind === 'WEAPON_GENERIC') return ENTITY_CONFIG.ITEM_WEAPON_GENERIC;
    if (upKind === 'ARMOR' || upKind === 'ARMOR_GENERIC') return ENTITY_CONFIG.ITEM_ARMOR_GENERIC;

    // Building-flavoured item kinds
    if (upKind === 'POLICE_WEAPON') return ENTITY_CONFIG.ITEM_WEAPON_POLICE_PISTOL;
    if (upKind === 'POLICE_ARMOR') return ENTITY_CONFIG.ITEM_ARMOR_POLICE_VEST;
    if (upKind === 'SHOP_WEAPON') return ENTITY_CONFIG.ITEM_WEAPON_SHOP_KNIFE;
  }

  return null;
}

/**
 * Flexible resolver used by the rest of the backend.
 *
 * Supported call shapes:
 *  - resolveEntityConfig('PLAYER')
 *  - resolveEntityConfig('ZOMBIE', 'WALKER')
 *  - resolveEntityConfig('ITEM', 'POLICE_WEAPON')
 *  - resolveEntityConfig({ type: 'ZOMBIE', kind: 'walker' })
 */
function resolveEntityConfig(a, b) {
  // Object with type/kind (e.g. Firestore doc)
  if (a && typeof a === 'object') {
    return resolveByTypeKind(a.type, a.kind);
  }

  // type + kind
  if (typeof a === 'string' && typeof b === 'string') {
    return resolveByTypeKind(a, b);
  }

  // single registry key
  if (typeof a === 'string') {
    return ENTITY_CONFIG[a] || null;
  }

  return null;
}

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
  ...raider,
  ...trader,
  ...items,

  // Registry
  ENTITY_CONFIG,
  getEntityConfig,
  getEntityConfigOrThrow,
  resolveEntityConfig,
};