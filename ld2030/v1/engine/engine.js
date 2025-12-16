// ld2030/v1/engine/engine.js
// Core game logic. No legacy paths.
// Engine coordinates rules + services, does not do Firestore transactions itself.

const { makeEquipmentService } = require('./equipment-service');
const { planMove } = require('./move-rules');

function makeEngine({ reader, writer }) {
  if (!reader) throw new Error('engine: reader is required');
  if (!writer) throw new Error('engine: writer is required');

  const equipmentService = makeEquipmentService({ reader, writer });

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
    if (!game) throw new Error('MOVE: game_not_found');

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error('MOVE: actor_not_found');

    const plan = planMove({ game, actor, dx, dy });
    if (!plan.ok) throw new Error(`MOVE: ${plan.reason}`);

    // AP gate: only player actors spend AP
    if (actor.isPlayer === true) {
      const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
      if (curAp < plan.apCost) throw new Error('MOVE: not_enough_ap');
      const nextAp = Math.max(0, curAp - plan.apCost);

      await writer.updatePlayer(gameId, uid, { pos: plan.to, currentAp: nextAp });
      return { ok: true, gameId, uid, pos: plan.to, apCost: plan.apCost, currentAp: nextAp };
    }

    // Non-player move (no AP gate yet)
    await writer.updatePlayer(gameId, uid, { pos: plan.to });
    return { ok: true, gameId, uid, pos: plan.to, apCost: plan.apCost };
  }

  async function handleAttackEntity({ gameId = 'lockdown2030', uid, targetId }) {
    if (!uid) throw new Error('ATTACK_ENTITY: uid is required');
    if (!targetId) throw new Error('ATTACK_ENTITY: targetId is required');

    return writer.attackEntity({ gameId, attackerId: uid, targetId });
  }

  async function handleEquip({ gameId = 'lockdown2030', uid, itemId }) {
    if (!uid) throw new Error('EQUIP_ITEM: uid is required');
    if (!itemId) throw new Error('EQUIP_ITEM: itemId is required');

    return equipmentService.equipItem({ gameId, actorId: uid, itemId });
  }

  async function handleUnequip({ gameId = 'lockdown2030', uid, itemId }) {
    if (!uid) throw new Error('UNEQUIP_ITEM: uid is required');
    if (!itemId) throw new Error('UNEQUIP_ITEM: itemId is required');

    return equipmentService.unequipItem({ gameId, actorId: uid, itemId });
  }

  return { processAction };
}

module.exports = { makeEngine };