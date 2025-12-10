// ld2030/v1/engine/action-router.js

function makeActionRouter({ engine, writer }) {
  if (!engine) throw new Error('action-router: engine is required');
  if (!writer) throw new Error('action-router: writer is required');

  // MOVE – still goes through the core engine
  async function handleMove({ uid, gameId = 'lockdown2030', dx = 0, dy = 0 }) {
    return engine.processAction({
      type: 'MOVE',
      uid,
      gameId,
      dx,
      dy,
    });
  }

  // Generic entity attack – single entry point for all future combat
  async function handleAttackEntity({
    uid,
    targetType,
    targetId,
    gameId = 'lockdown2030',
    damage,
    apCost,
  }) {
    return writer.attackEntity({
      gameId,
      attackerType: 'PLAYER',
      attackerId: uid,
      targetType,
      targetId,
      overrideDamage: damage,
      overrideApCost: apCost,
    });
  }

  return {
    handleMove,
    handleAttackEntity,
  };
}

module.exports = {
  makeActionRouter,
};