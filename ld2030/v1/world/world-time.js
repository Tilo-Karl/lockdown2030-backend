// ld2030/v1/world/world-time.js
// Single source of truth for tick clock math (V1).

const TICK_LEN_SECONDS = 300;
const TICKS_PER_DAY = 288;

function initWorldTimeDoc() {
  return {
    tickIndex: 0,
    tickLenSeconds: TICK_LEN_SECONDS,
    ticksPerDay: TICKS_PER_DAY,
  };
}

function advanceTickIndex(tickIndex) {
  const cur = Number.isFinite(tickIndex) ? tickIndex : 0;
  return cur + 1;
}

// Placeholder helpers (cosmetic for now)
function isDay(tickIndex) {
  const t = Number.isFinite(tickIndex) ? tickIndex : 0;
  const mod = ((t % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
  // naive: day is first half of the day
  return mod < (TICKS_PER_DAY / 2);
}

function timeOfDay(tickIndex) {
  const t = Number.isFinite(tickIndex) ? tickIndex : 0;
  const mod = ((t % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;
  return { tickInDay: mod, ticksPerDay: TICKS_PER_DAY };
}

module.exports = {
  TICK_LEN_SECONDS,
  TICKS_PER_DAY,
  initWorldTimeDoc,
  advanceTickIndex,
  isDay,
  timeOfDay,
};