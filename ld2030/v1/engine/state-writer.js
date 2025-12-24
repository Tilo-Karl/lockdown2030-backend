// ld2030/v1/engine/state-writer.js
// Thin orchestrator that wires together core writes, attacks, spawners, equipment, search, inventory, events, repair.

const makeCoreStateWriter = require('./state-writer-core');
const makeAttackStateWriter = require('./state-writer-attack');
const makeSpawnStateWriter = require('./state-writer-spawn');
const makeEquipmentStateWriter = require('./state-writer-equipment');
const makeSearchStateWriter = require('./state-writer-search');
const makeInventoryWriter = require('./state-writer-inventory');

// NEW
const makeEventsWriter = require('./state-writer-events');

// NEW
const makeRepairWriter = require('./state-writer-repair');

// NEW
const makeChatWriter = require('./state-writer-chat');

module.exports = function makeStateWriter(deps) {
  const core = makeCoreStateWriter(deps);
  const attack = makeAttackStateWriter(deps);
  const spawn = makeSpawnStateWriter(deps);
  const equipment = makeEquipmentStateWriter(deps);
  const search = makeSearchStateWriter(deps);
  const inventory = makeInventoryWriter(deps);

  const events = makeEventsWriter(deps);
  const repair = makeRepairWriter(deps);
  const chat = makeChatWriter(deps);

  return {
    ...core,
    ...attack,
    ...spawn,
    ...equipment,
    ...search,
    ...inventory,
    ...events,
    ...repair,
    ...chat,
  };
};
