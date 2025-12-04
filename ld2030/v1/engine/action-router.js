// ld2030/v1/engine/action-router.js
// Small layer that exposes nice helpers per action type.

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

  async function handleAttack({ uid, targetUid, gameId = 'lockdown2030' }) {
    return engine.processAction({
      type: 'ATTACK',
      uid,
      targetUid,
      gameId,
    });
  }

  async function handleAttackZombie({
    uid,
    zombieId,
    gameId = 'lockdown2030',
    damage,
    apCost,
  }) {
    return engine.writer.attackZombie({
      gameId,
      attackerUid: uid,
      zombieId,
      damage,
      apCost,
    });
  }

  // async function handleAttack(args) { ... }
  // async function handleEnterBuilding(args) { ... }

  return {
    handleMove,
    handleAttack,
    handleAttackZombie,
  };
}

module.exports = {
  makeActionRouter,
};