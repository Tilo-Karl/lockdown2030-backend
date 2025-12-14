// ld2030/v1/engine/state-writer.js
// Thin orchestrator that wires together core writes, attacks, spawners, equipment.

const makeCoreStateWriter = require('./state-writer-core');
const makeAttackStateWriter = require('./state-writer-attack');
const makeSpawnStateWriter = require('./state-writer-spawn');
const makeEquipmentStateWriter = require('./state-writer-equipment');

module.exports = function makeStateWriter(deps) {
  const core = makeCoreStateWriter(deps);
  const attack = makeAttackStateWriter(deps);
  const spawn = makeSpawnStateWriter(deps);
  const equipment = makeEquipmentStateWriter(deps);

  return {
    // Core writes
    ...core,

    // Combat / attacks
    ...attack,

    // Spawners
    ...spawn,

    // Equip / unequip
    ...equipment,
  };
};