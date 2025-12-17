// ld2030/v1/engine/action-router.js
// Router packages requests into actions.

function makeActionRouter({ engine }) {
  if (!engine) throw new Error('action-router: engine is required');

  async function handleMove({ uid, gameId = 'lockdown2030', dx = 0, dy = 0 }) {
    return engine.processAction({ type: 'MOVE', uid, gameId, dx, dy });
  }

  async function handleAttackEntity({ uid, targetId, gameId = 'lockdown2030' }) {
    if (!uid || !targetId) throw new Error('ATTACK_ENTITY: missing_uid_or_targetId');
    return engine.processAction({ type: 'ATTACK_ENTITY', uid, gameId, targetId });
  }

  async function handleEquipItem({ uid, itemId, gameId = 'lockdown2030' }) {
    if (!uid || !itemId) throw new Error('EQUIP_ITEM: missing_uid_or_itemId');
    return engine.processAction({ type: 'EQUIP_ITEM', uid, gameId, itemId });
  }

  async function handleUnequipItem({ uid, itemId, gameId = 'lockdown2030' }) {
    if (!uid || !itemId) throw new Error('UNEQUIP_ITEM: missing_uid_or_itemId');
    return engine.processAction({ type: 'UNEQUIP_ITEM', uid, gameId, itemId });
  }

  async function handleSearch({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('SEARCH: missing_uid');
    return engine.processAction({ type: 'SEARCH', uid, gameId });
  }

  async function handleEnterBuilding({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('ENTER_BUILDING: missing_uid');
    return engine.processAction({ type: 'ENTER_BUILDING', uid, gameId });
  }

  async function handleStairs({ uid, dz, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('STAIRS: missing_uid');

    const step = Number(dz);
    if (!Number.isFinite(step) || (step !== 1 && step !== -1)) {
      throw new Error('STAIRS: dz_must_be_plus_or_minus_1');
    }

    return engine.processAction({ type: 'STAIRS', uid, gameId, dz: step });
  }

  async function handleClimbIn({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('CLIMB_IN: missing_uid');
    return engine.processAction({ type: 'CLIMB_IN', uid, gameId });
  }

  async function handleClimbOut({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('CLIMB_OUT: missing_uid');
    return engine.processAction({ type: 'CLIMB_OUT', uid, gameId });
  }

  async function handleSecureDoor({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('SECURE_DOOR: missing_uid');
    return engine.processAction({ type: 'SECURE_DOOR', uid, gameId });
  }

  async function handleBarricadeDoor({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('BARRICADE_DOOR: missing_uid');
    return engine.processAction({ type: 'BARRICADE_DOOR', uid, gameId });
  }

  async function handleDebarricadeDoor({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('DEBARRICADE_DOOR: missing_uid');
    return engine.processAction({ type: 'DEBARRICADE_DOOR', uid, gameId });
  }

  async function handleRepairDoor({ uid, gameId = 'lockdown2030' }) {
    if (!uid) throw new Error('REPAIR_DOOR: missing_uid');
    return engine.processAction({ type: 'REPAIR_DOOR', uid, gameId });
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
  };
}

module.exports = { makeActionRouter };