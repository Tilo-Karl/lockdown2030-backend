// ld2030/v1/engine/search-outcome.js
// Resolves loot + events for search action (engine-only helper).

const { rollLootKind } = require('../loot/loot-tables');
const { EVENT_TYPES, MESSAGE_KEYS } = require('../events/event-constants');

function normalizeBuildingType(buildingType) {
  if (!buildingType) return null;
  return String(buildingType).toUpperCase();
}

function remainingFromResult(result) {
  const n = Number(result?.remaining);
  return Number.isFinite(n) ? n : 0;
}

async function resolveSearchOutcome({
  planned,
  buildingType,
  searchResult,
  actorId,
  pos,
  spawnItemAtCell,
}) {
  if (!planned || typeof planned !== 'object') {
    throw new Error('search-outcome: planned_required');
  }
  if (!searchResult || typeof searchResult !== 'object') {
    throw new Error('search-outcome: result_required');
  }

  const buildingKey = normalizeBuildingType(buildingType);
  const remaining = remainingFromResult(searchResult);

  let loot = null;
  let failureReason = null;

  if (planned.willAttemptLoot === true) {
    const spawnKind = rollLootKind(buildingKey || '');
    if (spawnKind) {
      if (typeof spawnItemAtCell !== 'function') {
        throw new Error('search-outcome: spawn_fn_required');
      }
      const spawned = await spawnItemAtCell(spawnKind);
      if (spawned && spawned.itemId) {
        loot = {
          itemId: spawned.itemId,
          kind: spawned.kind || spawnKind,
        };
      } else {
        failureReason = 'spawn_failed';
      }
    } else {
      failureReason = 'no_table';
    }
  } else if (!planned.canLoot) {
    failureReason = 'depleted';
  } else {
    failureReason = 'roll_failed';
  }

  const events = [];

  if (loot) {
    events.push({
      type: EVENT_TYPES.SEARCH_SUCCESS,
      messageKey: MESSAGE_KEYS.SEARCH_SUCCESS,
      args: {
        itemKind: loot.kind,
        buildingType: buildingKey,
        remaining,
      },
      actorId,
      pos,
    });
  } else {
    events.push({
      type: EVENT_TYPES.SEARCH_EMPTY,
      messageKey: MESSAGE_KEYS.SEARCH_EMPTY,
      args: {
        buildingType: buildingKey,
        reason: failureReason,
        remaining,
      },
      actorId,
      pos,
    });
  }

  return {
    loot,
    failureReason,
    buildingType: buildingKey,
    events,
  };
}

module.exports = {
  resolveSearchOutcome,
};
