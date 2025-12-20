// ld2030/v1/config/zombie-forms.js
// Zombie "forms" (aka archetypes) + per-form tuning knobs.
// Tick uses these as modifiers (no AI rewrite required).

const ZOMBIE_FORMS = {
  walker: {
    id: 'walker',
    name: 'Walker',
    desc: 'Baseline undead. Slow, stubborn.',
    mods: {
      moveBiasToNoise: 1.0,
      stairsChance: 0.25,
      climbChance: 0.10,
      barrierDamageMult: 1.0,
      groanChance: 0.20,
      groanRange: 4,
    },
  },

  runner: {
    id: 'runner',
    name: 'Runner',
    desc: 'Fast, climbs, changes floors more often.',
    mods: {
      moveBiasToNoise: 1.1,
      stairsChance: 0.45,
      climbChance: 0.35,
      barrierDamageMult: 0.9,
      groanChance: 0.15,
      groanRange: 4,
    },
  },

  brute: {
    id: 'brute',
    name: 'Brute',
    desc: 'Smashes barriers and doors hard.',
    mods: {
      moveBiasToNoise: 0.9,
      stairsChance: 0.20,
      climbChance: 0.05,
      barrierDamageMult: 1.8,
      groanChance: 0.20,
      groanRange: 4,
    },
  },

  smart: {
    id: 'smart',
    name: 'Smart',
    desc: 'Cunning. Best at using the groan/noise map to converge.',
    mods: {
      moveBiasToNoise: 1.6,
      stairsChance: 0.35,
      climbChance: 0.20,
      barrierDamageMult: 1.0,
      groanChance: 0.30,
      groanRange: 6,
      // optional later:
      canInterpretRadio: true,
      canCoordinate: true,
    },
  },
};

module.exports = {
  ZOMBIE_FORMS,
};