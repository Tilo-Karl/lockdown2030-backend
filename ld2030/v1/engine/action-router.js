// Action router: turns HTTP DTOs into engine actions.
// Keep exports at bottom.

function makeActionRouter({ engine }) {
  if (!engine) throw new Error('action-router: engine is required');

  const run = (action) => engine.processAction(action);

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

  // Stairs barricades
  async function handleBarricadeStairs({ uid, gameId, dz }) {
    return run({ type: 'BARRICADE_STAIRS', uid, gameId, dz });
  }

  async function handleDebarricadeStairs({ uid, gameId, dz }) {
    return run({ type: 'DEBARRICADE_STAIRS', uid, gameId, dz });
  }

  return {
    handleMove,
    handleAttackEntity,
    handleEquipItem,
    handleUnequipItem,
    handleSearch,
    handleEnterBuilding,
    handleStairs,
    handleClimbIn,
    handleClimbOut,

    handleSecureDoor,
    handleBarricadeDoor,
    handleDebarricadeDoor,
    handleRepairDoor,

    handleBarricadeStairs,
    handleDebarricadeStairs,
  };
}

module.exports = { makeActionRouter };