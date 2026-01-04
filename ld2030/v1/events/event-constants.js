// ld2030/v1/events/event-constants.js
// Single source of truth for event feed constants + keys (V1).

const MAX_KEEP = 25;

// Feed endpoint defaults
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

// Event type strings (stable)
const EVENT_TYPES = Object.freeze({
  COMBAT_ATTACK: 'combat.attack',
  COMBAT_HIT: 'combat.hit',
  COMBAT_MISS: 'combat.miss',
  COMBAT_KILL: 'combat.kill',
  SEARCH_SUCCESS: 'search.success',
  SEARCH_EMPTY: 'search.empty',
});

// Frontend maps messageKey + args -> localized string (stable)
const MESSAGE_KEYS = Object.freeze({
  COMBAT_ATTACK: 'combat.attack',
  COMBAT_HIT: 'combat.hit',
  COMBAT_MISS: 'combat.miss',
  COMBAT_KILL: 'combat.kill',
  SEARCH_SUCCESS: 'search.success',
  SEARCH_EMPTY: 'search.empty',
});

module.exports = {
  MAX_KEEP,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  EVENT_TYPES,
  MESSAGE_KEYS,
};
