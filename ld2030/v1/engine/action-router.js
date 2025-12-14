// ld2030/v1/engine/action-router.js
// Router should NOT bypass engine. It only packages requests into actions.

function makeActionRouter({ engine }) {
  if (!engine) throw new Error('action-router: engine is required');

  async function handleMove({ uid, gameId = 'lockdown2030', dx = 0, dy = 0 }) {
    return engine.processAction({
      type: 'MOVE',
      uid,
      gameId,
      dx,
      dy,
    });
  }

  async function handleAttackEntity({ uid, targetId, gameId = 'lockdown2030' }) {
    if (!uid || !targetId) throw new Error('ATTACK_ENTITY: missing_uid_or_targetId');

    return engine.processAction({
      type: 'ATTACK_ENTITY',
      uid,
      gameId,
      targetId,
    });
  }

  async function handleEquipItem({ uid, itemId, gameId = 'lockdown2030' }) {
    if (!uid || !itemId) throw new Error('EQUIP_ITEM: missing_uid_or_itemId');

    return engine.processAction({
      type: 'EQUIP_ITEM',
      uid,
      gameId,
      itemId,
    });
  }

  async function handleUnequipItem({ uid, itemId, gameId = 'lockdown2030' }) {
    if (!uid || !itemId) throw new Error('UNEQUIP_ITEM: missing_uid_or_itemId');

    return engine.processAction({
      type: 'UNEQUIP_ITEM',
      uid,
      gameId,
      itemId,
    });
  }

  return {
    handleMove,
    handleAttackEntity,
    handleEquipItem,
    handleUnequipItem,
  };
}

module.exports = { makeActionRouter };