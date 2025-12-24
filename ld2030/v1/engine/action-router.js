// ld2030/v1/engine/action-router.js
// Action router: single choke-point for game actions.
// - turns HTTP DTOs into action objects
// - dispatches actions to engine methods / handlers
//
// NOTE: engine does NOT expose processAction anymore. This file owns dispatch.

function makeActionRouter({ engine }) {
  if (!engine) throw new Error('action-router: engine is required');

  async function processAction(action) {
    if (!action || typeof action !== 'object') throw new Error('ACTION: missing');
    const t = String(action.type || '');

    switch (t) {
      case 'MOVE':
        return engine.move(action);

      case 'SEARCH':
        return engine.search(action);

      case 'ENTER_BUILDING':
        return engine.enterBuilding(action);

      case 'STAIRS':
        return engine.stairs(action);

      case 'CLIMB_IN':
        return engine.climbHandlers.handleClimbIn(action);

      case 'CLIMB_OUT':
        return engine.climbHandlers.handleClimbOut(action);

      case 'STAND_UP':
        return engine.standHandlers.handleStandUp(action);

      // Door actions (handlers own the rules + persistence)
      case 'SECURE_DOOR':
        return engine.doorHandlers.handleSecureDoor(action);

      case 'BARRICADE_DOOR':
        return engine.doorHandlers.handleBarricadeDoor(action);

      case 'DEBARRICADE_DOOR':
        return engine.doorHandlers.handleDebarricadeDoor(action);

      case 'REPAIR_DOOR':
        return engine.doorHandlers.handleRepairDoor(action);

      // NEW: inside cell repairs
      case 'REPAIR_CELL':
        return engine.repairHandlers.handleRepairCell(action);

      // Stairs barricade actions
      case 'BARRICADE_STAIRS':
        return engine.stairHandlers.handleBarricadeStairs(action);

      case 'DEBARRICADE_STAIRS':
        return engine.stairHandlers.handleDebarricadeStairs(action);

      case 'ATTACK_ENTITY':
        return engine.attackEntity(action);

      case 'EQUIP_ITEM':
        return engine.equipItem(action);

      case 'UNEQUIP_ITEM':
        return engine.unequipItem(action);

      default:
        throw new Error(`Unknown action type: ${t}`);
    }
  }

  // DTO helpers (your HTTP route files call these)
  const run = (action) => processAction(action);

  async function handleMove({ uid, gameId, dx, dy }) {
    return run({ type: 'MOVE', uid, gameId, dx, dy });
  }

  async function handleAttackEntity({ uid, gameId, targetId }) {
    return run({ type: 'ATTACK_ENTITY', uid, gameId, targetId });
  }

  async function handleEquipItem({ uid, gameId, itemId }) {
    return run({ type: 'EQUIP_ITEM', uid, gameId, itemId });
  }

  async function handleUnequipItem({ uid, gameId, itemId }) {
    return run({ type: 'UNEQUIP_ITEM', uid, gameId, itemId });
  }

  async function handleSearch({ uid, gameId }) {
    return run({ type: 'SEARCH', uid, gameId });
  }

  async function handleEnterBuilding({ uid, gameId }) {
    return run({ type: 'ENTER_BUILDING', uid, gameId });
  }

  async function handleStairs({ uid, gameId, dz }) {
    return run({ type: 'STAIRS', uid, gameId, dz });
  }

  async function handleClimbIn({ uid, gameId }) {
    return run({ type: 'CLIMB_IN', uid, gameId });
  }

  async function handleClimbOut({ uid, gameId }) {
    return run({ type: 'CLIMB_OUT', uid, gameId });
  }

  async function handleStandUp({ uid, gameId }) {
    return run({ type: 'STAND_UP', uid, gameId });
  }

  // Doors
  async function handleSecureDoor({ uid, gameId }) {
    return run({ type: 'SECURE_DOOR', uid, gameId });
  }

  async function handleBarricadeDoor({ uid, gameId }) {
    return run({ type: 'BARRICADE_DOOR', uid, gameId });
  }

  async function handleDebarricadeDoor({ uid, gameId }) {
    return run({ type: 'DEBARRICADE_DOOR', uid, gameId });
  }

  async function handleRepairDoor({ uid, gameId }) {
    return run({ type: 'REPAIR_DOOR', uid, gameId });
  }

  // NEW: repair cell
  async function handleRepairCell({ uid, gameId, preferred = null }) {
    return run({ type: 'REPAIR_CELL', uid, gameId, preferred });
  }

  // Stairs barricades
  async function handleBarricadeStairs({ uid, gameId, dz }) {
    return run({ type: 'BARRICADE_STAIRS', uid, gameId, dz });
  }

  async function handleDebarricadeStairs({ uid, gameId, dz }) {
    return run({ type: 'DEBARRICADE_STAIRS', uid, gameId, dz });
  }

  return {
    // choke point
    processAction,

    // DTO helpers used by HTTP route files
    handleMove,
    handleAttackEntity,
    handleEquipItem,
    handleUnequipItem,
    handleSearch,
    handleEnterBuilding,
    handleStairs,
    handleClimbIn,
    handleClimbOut,
    handleStandUp,

    handleSecureDoor,
    handleBarricadeDoor,
    handleDebarricadeDoor,
    handleRepairDoor,

    // NEW
    handleRepairCell,

    handleBarricadeStairs,
    handleDebarricadeStairs,
  };
}

module.exports = { makeActionRouter };