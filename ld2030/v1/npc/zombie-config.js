// ld2030/v1/npc/zombie-config.js
// Central place to define zombie types + base stats for Lockdown 2030.
//
// These are *templates* used when spawning zombies. The spawner copies
// these values into each Firestore zombie document (instance).
//
// When you want to tune zombies (more HP, more damage, etc.), do it here.

const ZOMBIES = {
  WALKER: {
    // Identity
    type: 'ZOMBIE',
    kind: 'walker',

    // Core stats
    baseHp: 60,           // starting HP for a fresh walker
    biteDamage: 10,       // damage per successful bite

    // Movement / AI pacing (for the future tick system)
    apPerTick: 1,         // how many AP they gain per world tick
    moveCost: 1,          // AP cost to move one tile
    attackCost: 1,        // AP cost to bite once
    moveEveryNTicks: 1,   // minimum ticks between moves (coarse throttle)

    // Behaviour knobs (for later)
    aggroRange: 4,        // tiles within which they notice a player
    maxRoamDistance: 8,   // how far they wander from their spawn tile
  },

  // Add more types later, e.g.:
  // RUNNER: { ... },
  // BRUTE:  { ... },
};

module.exports = ZOMBIES;