// ld2030/v1/engine/engine.js
// Core game logic: takes actions, applies rules, calls state-writer.

function makeEngine({ reader, writer }) {
  if (!reader) throw new Error('engine: reader is required');
  if (!writer) throw new Error('engine: writer is required');

  async function processAction(action) {
    switch (action.type) {
      case 'MOVE':
        return handleMove(action);
      // case 'ATTACK':
      //   return handleAttack(action);
      // case 'ENTER_BUILDING':
      //   return handleEnterBuilding(action);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async function handleMove({ gameId = 'lockdown2030', uid, dx = 0, dy = 0 }) {
    if (!uid) throw new Error('MOVE: uid is required');

    const game = await reader.getGame(gameId);
    const gridSize = game?.gridsize || { w: 32, h: 32 };

    const currentPlayer = (await reader.getPlayer(gameId, uid)) || {
      pos: { x: 0, y: 0 },
      hp: 100,
      ap: 3,
      alive: true,
    };

    const curPos = currentPlayer.pos || { x: 0, y: 0 };
    const newX = (curPos.x || 0) + Number(dx);
    const newY = (curPos.y || 0) + Number(dy);

    // Clamp to grid for safety (authoritative server)
    const clampedX = Math.min(Math.max(newX, 0), gridSize.w - 1);
    const clampedY = Math.min(Math.max(newY, 0), gridSize.h - 1);

    const nextPlayer = {
      ...currentPlayer,
      pos: { x: clampedX, y: clampedY },
    };

    await writer.savePlayer(gameId, uid, nextPlayer);

    return {
      ok: true,
      gameId,
      uid,
      pos: nextPlayer.pos,
    };
  }

  return {
    processAction,
  };
}

module.exports = {
  makeEngine,
};