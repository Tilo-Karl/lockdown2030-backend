// ld2030/v1/engine/engine.js
// Core game logic. No legacy paths.

const { canEquip } = require('./equipment-rules');

function makeEngine({ reader, writer }) {
  if (!reader) throw new Error('engine: reader is required');
  if (!writer) throw new Error('engine: writer is required');

  async function processAction(action) {
    switch (action.type) {
      case 'MOVE':
        return handleMove(action);
      case 'ATTACK_ENTITY':
        return handleAttackEntity(action);
      case 'EQUIP_ITEM':
        return handleEquip(action);
      case 'UNEQUIP_ITEM':
        return handleUnequip(action);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async function handleMove({ gameId = 'lockdown2030', uid, dx = 0, dy = 0 }) {
    if (!uid) throw new Error('MOVE: uid is required');

    const game = await reader.getGame(gameId);
    const gridSize = game?.gridsize || { w: 32, h: 32 };

    const actor = await reader.getPlayer(gameId, uid);
    const pos = actor?.pos || { x: 0, y: 0 };

    const x = Math.min(Math.max(pos.x + dx, 0), gridSize.w - 1);
    const y = Math.min(Math.max(pos.y + dy, 0), gridSize.h - 1);

    await writer.updatePlayer(gameId, uid, { pos: { x, y } });
    return { ok: true, pos: { x, y } };
  }

  async function handleAttackEntity({ gameId = 'lockdown2030', uid, targetId }) {
    if (!uid) throw new Error('ATTACK_ENTITY: uid is required');
    if (!targetId) throw new Error('ATTACK_ENTITY: targetId is required');

    return writer.attackEntity({ gameId, attackerId: uid, targetId });
  }

  async function handleEquip({ gameId = 'lockdown2030', uid, itemId }) {
    if (!uid) throw new Error('EQUIP_ITEM: uid is required');
    if (!itemId) throw new Error('EQUIP_ITEM: itemId is required');

    const actor = await reader.getPlayer(gameId, uid);
    const item = await reader.getItem(gameId, itemId);
    if (!actor || !item) throw new Error('equip: missing_actor_or_item');

    const check = canEquip({ actor, item });
    if (!check.ok) throw new Error(`equip: ${check.reason}`);

    return writer.equipItem({ gameId, actorId: uid, itemId });
  }

  async function handleUnequip({ gameId = 'lockdown2030', uid, itemId }) {
    if (!uid) throw new Error('UNEQUIP_ITEM: uid is required');
    if (!itemId) throw new Error('UNEQUIP_ITEM: itemId is required');

    return writer.unequipItem({ gameId, actorId: uid, itemId });
  }

  return { processAction };
}

module.exports = { makeEngine };