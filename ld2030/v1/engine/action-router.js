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

  // async function handleAttack(args) { ... }
  // async function handleEnterBuilding(args) { ... }

  return {
    handleMove,
  };
}

module.exports = {
  makeActionRouter,
};