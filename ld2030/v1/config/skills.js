// ld2030/v1/config/skills.js
// Human skills + class prereqs (design-locked).
//
// Rules:
// - R1–R3: anyone can buy (general tier).
// - A class unlocks when you have R3 in BOTH prereq skills.
// - After class is locked: ONLY that class’s prereq skills can go R4+ (up to R6).
// - Neutral skills can go to R6 for anyone.

const RANKS = {
  GENERAL_MAX: 3,
  CLASS_MAX: 6,
  NEUTRAL_MAX: 6,
};

// Skill IDs are the source of truth.
// Names are what you show to players.
const SKILLS = {
  // ---- Class prereq skills (R4+ only after class lock for that class) ----
  melee: {
    id: 'melee',
    name: 'Melee',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['combat', 'prereq'],
    // Initial knobs (keep simple): AP + (later) hit/dmg
    knobs: { unskilledApCost: 5, minApCost: 1, apCostDownPerRank: 1 },
  },

  firearms: {
    id: 'firearms',
    name: 'Firearms',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['combat', 'prereq'],
    knobs: { unskilledApCost: 5, minApCost: 1, apCostDownPerRank: 1 },
  },

  deadCalm: {
    id: 'deadCalm',
    name: 'Dead Calm',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['mental', 'stress', 'prereq'],
    // Stress is universal; Dead Calm reduces penalties (exact math later)
    knobs: { stressResistPerRank: 1 },
  },

  fixer: {
    id: 'fixer',
    name: 'Fixer',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['utility', 'build', 'prereq'],
    knobs: { unskilledApCost: 5, minApCost: 1, apCostDownPerRank: 1 },
  },

  finder: {
    id: 'finder',
    name: 'Finder',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['utility', 'loot', 'prereq'],
    knobs: { lootBonusPerRank: 1 }, // placeholder; you’ll implement later
  },

  sneakyBastard: {
    id: 'sneakyBastard',
    name: 'Sneaky Bastard',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['stealth', 'noise', 'prereq'],
    // One stealth skill that reduces noise for most non-gun actions
    knobs: { noiseDownPerRankPct: 15 }, // e.g. -15% per rank (placeholder)
  },

  firstAid: {
    id: 'firstAid',
    name: 'First Aid',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['medical', 'heal', 'prereq'],
    knobs: { healBonusPerRank: 1 }, // placeholder
  },

  dopeDoc: {
    id: 'dopeDoc',
    name: 'Dope Doc',
    generalMaxRank: RANKS.GENERAL_MAX,
    maxRank: RANKS.CLASS_MAX,
    tags: ['medical', 'drugs', 'prereq'],
    // Drug unlock ladder (implement items later)
    drugUnlocksByRank: {
      1: ['ghost_dose'],   // stealth/noise utility
      2: ['focus_dose'],   // accuracy/hit chance
      3: ['fury_dose'],    // damage boost
      4: ['adrenal_shot'], // +1 AP (strong)
      5: ['stunner'],      // stun/slow
      6: ['revive'],       // only if you add downed/infected
    },
  },

  // ---- Neutral skills (R1–R6 for anyone, any class) ----
  athletics: {
    id: 'athletics',
    name: 'Athletics',
    generalMaxRank: RANKS.NEUTRAL_MAX,
    maxRank: RANKS.NEUTRAL_MAX,
    tags: ['movement', 'climb', 'neutral'],
    knobs: { climbApDownPerRank: 1, climbInjuryDownPerRank: 1 }, // placeholders
  },

  brawling: {
    id: 'brawling',
    name: 'Brawling',
    generalMaxRank: RANKS.NEUTRAL_MAX,
    maxRank: RANKS.NEUTRAL_MAX,
    tags: ['combat', 'unarmed', 'neutral'],
    knobs: { unarmedDamageUpPerRank: 1 }, // placeholder
  },
};

// Classes are just config.
// Unlock condition: BOTH prereq skills at R3.
const CLASSES = {
  bruiser: {
    id: 'bruiser',
    name: 'Bruiser',
    prereq: ['melee', 'deadCalm'],
    unlockRank: RANKS.GENERAL_MAX,
  },
  gunslinger: {
    id: 'gunslinger',
    name: 'Gunslinger',
    prereq: ['firearms', 'deadCalm'],
    unlockRank: RANKS.GENERAL_MAX,
  },
  scavenger: {
    id: 'scavenger',
    name: 'Scavenger',
    prereq: ['finder', 'sneakyBastard'],
    unlockRank: RANKS.GENERAL_MAX,
  },
  warden: {
    id: 'warden',
    name: 'Warden',
    prereq: ['fixer', 'melee'],
    unlockRank: RANKS.GENERAL_MAX,
  },
  medic: {
    id: 'medic',
    name: 'Medic',
    prereq: ['firstAid', 'dopeDoc'],
    unlockRank: RANKS.GENERAL_MAX,
  },
};

module.exports = {
  RANKS,
  SKILLS,
  CLASSES,
};