// ld2030/v1/engine/handlers/door-handlers.js
// Door action handlers (secure/barricade/debarricade/repair).
// Engine delegates door gameplay here.

const { DOOR } = require('../../config');
const { getBuildingIndex } = require('../building-index');
const { makeDoorService } = require('../door-service');

function makeDoorHandlers({ reader, writer, doorService: doorServiceIn }) {
  if (!reader) throw new Error('door-handlers: reader is required');
  if (!writer) throw new Error('door-handlers: writer is required');

  // Prefer injected service (from engine), fallback to local construction
  const doorService = doorServiceIn || makeDoorService({ reader });

  function requireInside(actor, tag) {
    if (actor?.isInsideBuilding !== true) throw new Error(`${tag}: must_be_inside_building`);
  }

  function requireValidXY(actor, tag) {
    const pos = actor?.pos || {};
    const x = Number(pos.x);
    const y = Number(pos.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`${tag}: invalid_pos`);
    return { x, y };
  }

  function requireOnBuildingTile(byXY, x, y, tag) {
    const id = byXY.get(`${x},${y}`) || null;
    if (!id) throw new Error(`${tag}: not_on_building_tile`);
    return id;
  }

  async function loadGameActorAndIndex({ gameId, uid, tag }) {
    const game = await reader.getGame(gameId);
    if (!game) throw new Error(`${tag}: game_not_found`);

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error(`${tag}: actor_not_found`);

    const mapMeta = game?.mapMeta || {};
    const { byXY } = getBuildingIndex(game, mapMeta);

    return { game, actor, byXY };
  }

  async function spendApIfPlayer({ gameId, uid, actor, apCost, tag }) {
    if (actor?.isPlayer !== true) {
      const curAp = Number.isFinite(actor?.currentAp) ? Number(actor.currentAp) : 0;
      return { curAp, nextAp: curAp };
    }

    const curAp = Number.isFinite(actor?.currentAp) ? Number(actor.currentAp) : 0;
    if (curAp < apCost) throw new Error(`${tag}: not_enough_ap`);
    const nextAp = Math.max(0, curAp - apCost);

    await writer.updatePlayer(gameId, uid, { currentAp: nextAp });
    return { curAp, nextAp };
  }

  async function persistDoor(gameId, x, y, d) {
    const doorId = doorService.doorIdForTile(x, y);
    await writer.updateDoor(gameId, doorId, {
      doorId,
      x,
      y,
      isOpen: d.isOpen === true,
      isSecured: d.isSecured === true,
      barricadeLevel: Number.isFinite(d.barricadeLevel) ? Number(d.barricadeLevel) : 0,
      broken: d.broken === true,
      hp: Number.isFinite(d.hp) ? Number(d.hp) : 0,
    });
    return doorId;
  }

  async function handleSecureDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'SECURE_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const { actor, byXY } = await loadGameActorAndIndex({ gameId, uid, tag: TAG });
    requireInside(actor, TAG);

    const { x, y } = requireValidXY(actor, TAG);
    requireOnBuildingTile(byXY, x, y, TAG);

    const apCost = Number.isFinite(DOOR.SECURE_AP_COST) ? Number(DOOR.SECURE_AP_COST) : 1;
    const { nextAp } = await spendApIfPlayer({ gameId, uid, actor, apCost, tag: TAG });

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x, y });
    const nextDoor = doorService.applySecure(curDoor);

    const doorId = await persistDoor(gameId, x, y, nextDoor);

    return { ok: true, gameId, uid, doorId, ...nextDoor, apCost, currentAp: nextAp };
  }

  async function handleBarricadeDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'BARRICADE_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const { actor, byXY } = await loadGameActorAndIndex({ gameId, uid, tag: TAG });
    requireInside(actor, TAG);

    const { x, y } = requireValidXY(actor, TAG);
    requireOnBuildingTile(byXY, x, y, TAG);

    const apCost = Number.isFinite(DOOR.BARRICADE_AP_COST) ? Number(DOOR.BARRICADE_AP_COST) : 1;
    const { nextAp } = await spendApIfPlayer({ gameId, uid, actor, apCost, tag: TAG });

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x, y });
    const nextDoor = doorService.applyBarricade(curDoor);

    const doorId = await persistDoor(gameId, x, y, nextDoor);

    return { ok: true, gameId, uid, doorId, ...nextDoor, apCost, currentAp: nextAp };
  }

  async function handleDebarricadeDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'DEBARRICADE_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const { actor, byXY } = await loadGameActorAndIndex({ gameId, uid, tag: TAG });
    requireInside(actor, TAG);

    const { x, y } = requireValidXY(actor, TAG);
    requireOnBuildingTile(byXY, x, y, TAG);

    const apCost = Number.isFinite(DOOR.DEBARRICADE_AP_COST) ? Number(DOOR.DEBARRICADE_AP_COST) : 1;
    const { nextAp } = await spendApIfPlayer({ gameId, uid, actor, apCost, tag: TAG });

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x, y });
    const nextDoor = doorService.applyDebarricade(curDoor);

    const doorId = await persistDoor(gameId, x, y, nextDoor);

    return { ok: true, gameId, uid, doorId, ...nextDoor, apCost, currentAp: nextAp };
  }

  async function handleRepairDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'REPAIR_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const { actor, byXY } = await loadGameActorAndIndex({ gameId, uid, tag: TAG });
    requireInside(actor, TAG);

    const { x, y } = requireValidXY(actor, TAG);
    requireOnBuildingTile(byXY, x, y, TAG);

    const apCost = Number.isFinite(DOOR.REPAIR_AP_COST) ? Number(DOOR.REPAIR_AP_COST) : 2;
    const { nextAp } = await spendApIfPlayer({ gameId, uid, actor, apCost, tag: TAG });

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x, y });
    const nextDoor = doorService.applyRepair(curDoor);

    const doorId = await persistDoor(gameId, x, y, nextDoor);

    return { ok: true, gameId, uid, doorId, ...nextDoor, apCost, currentAp: nextAp };
  }

  return {
    handleSecureDoor,
    handleBarricadeDoor,
    handleDebarricadeDoor,
    handleRepairDoor,
  };
}

module.exports = { makeDoorHandlers };