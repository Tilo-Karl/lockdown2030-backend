// ld2030/v1/npc/zombie-config.js
// Central place to define zombie types + behaviour tuning for Lockdown 2030.
//
// These are *templates* used when spawning zombies. The spawner copies
// these values into each Firestore zombie document (instance).
//
// Base stats (hp, damage, etc.) now come from the unified entity config,
// so all entities share the same source of truth for core numbers.

// LEGACY - DELETE!

const { resolveEntityConfig } = require('../entity');

// Pull the base walker stats from the unified entity config.
// If the config is missing for some reason, fall back to sensible defaults.
const WALKER_BASE = resolveEntityConfig('ZOMBIE', 'WALKER') || {
  type: 'ZOMBIE',
  kind: 'walker',
  baseHp: 60,
  biteDamage: 10,
  hitChance: 0.8,
};

const ZOMBIES = {
  WALKER: {
    // Core identity + stats from the entity config.
    ...WALKER_BASE,

    // Behaviour knobs (tuned here, independent of base stats).
    // Tiles within which they notice a player.
    aggroRange: 4,
    // How far they wander from their spawn tile.
    maxRoamDistance: 8,
  },

  // Add more types later, e.g.:
  // RUNNER: { ...resolveEntityConfig('ZOMBIE', 'RUNNER'), aggroRange: 6, maxRoamDistance: 10 },
  // BRUTE:  { ...resolveEntityConfig('ZOMBIE', 'BRUTE'),  aggroRange: 3, maxRoamDistance: 6  },
};

module.exports = ZOMBIES;