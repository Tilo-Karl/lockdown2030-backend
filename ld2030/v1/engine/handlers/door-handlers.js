// ld2030/v1/engine/handlers/door-handlers.js
// Door action handlers (secure/barricade/debarricade/repair).
// Persists ONLY runtime truth via edges/*.
// Door ops are inside+ground only.
// AP + edge write are ATOMIC via writer.updateActorAndEdgeAtomic.

const { apCostFor, ensureActorHasAp } = require('../../actions/ap-service');
const { requirePos, cellIdFor } = require('../../actions/validators');
const { makeDoorService } = require('../door-service');
const { integrityLabel } = require('../integrity');
const { DOOR } = require('../../config/config-doors');

const STRUCTURE_FALLBACK_MAX = Math.max(0, Number(DOOR?.BASE_HP ?? 10));

function makeDoorHandlers({ reader, writer, doorService: doorServiceIn }) {
  if (!reader) throw new Error('door-handlers: reader is required');
  if (!writer) throw new Error('door-handlers: writer is required');
  if (typeof writer.updateActorAndEdgeAtomic !== 'function') {
    throw new Error('door-handlers: writer.updateActorAndEdgeAtomic is required');
  }

  const doorService = doorServiceIn || makeDoorService({ reader });

  function requireInsideGround(actor, tag) {
    const pos = requirePos(actor, tag);
    if (pos.layer !== 1) throw new Error(`${tag}: must_be_inside_building`);
    if (pos.z !== 0) throw new Error(`${tag}: must_be_ground_floor`);
    return pos;
  }

  async function requireInsideCellExists(gameId, x, y, tag) {
    const c = await reader.getCell(gameId, cellIdFor(x, y, 0, 1));
    if (!c) throw new Error(`${tag}: must_be_on_building_tile`);
  }

  function decorateDoorForResponse(d) {
    const structureMax = Number.isFinite(d.structureMaxHp) ? Number(d.structureMaxHp) : 0;
    const barricadeMax = Number.isFinite(d.barricadeMaxHp) ? Number(d.barricadeMaxHp) : 0;
    const structureIntegrity = integrityLabel({ hp: d.structureHp ?? 0, maxHp: structureMax });
    const barricadeIntegrity = integrityLabel({ hp: d.barricadeHp ?? 0, maxHp: barricadeMax });
    return { ...d, structureMaxHp: structureMax, barricadeMaxHp: barricadeMax, structureIntegrity, barricadeIntegrity };
  }

  async function persistDoorAtomic({ gameId, uid, actor, apCost, door }) {
    const edgeId = doorService.doorEdgeIdForTile(door.x, door.y);

    const defaults = doorService.doorDefaults(door.x, door.y);
    const a = door.a ? door.a : defaults.a;
    const b = door.b ? door.b : defaults.b;

    const { nextAp } = ensureActorHasAp(actor, apCost, 'AP');

    const actorPatch = (actor?.isPlayer === true) ? { currentAp: nextAp } : {};

    const edgePatch = {
      kind: 'door',
      // edgeId enforced by writer
      a,
      b,
      x: door.x,
      y: door.y,
      outsideCellId: String(door.outsideCellId || defaults.outsideCellId),
      insideCellId: String(door.insideCellId || defaults.insideCellId),
      isOpen: door.isOpen === true,
      isSecured: door.isSecured === true,
      structureHp: Number.isFinite(door.structureHp) ? Math.max(0, Number(door.structureHp)) : 0,
      structureMaxHp: Number.isFinite(door.structureMaxHp) ? Math.max(0, Number(door.structureMaxHp)) : STRUCTURE_FALLBACK_MAX,
      barricadeLevel: Number.isFinite(door.barricadeLevel) ? Number(door.barricadeLevel) : 0,
      barricadeHp: Number.isFinite(door.barricadeHp) ? Math.max(0, Number(door.barricadeHp)) : 0,
      barricadeMaxHp: Number.isFinite(door.barricadeMaxHp) ? Math.max(0, Number(door.barricadeMaxHp)) : 0,
      isDestroyed: door.isDestroyed === true,
    };

    await writer.updateActorAndEdgeAtomic(gameId, uid, actorPatch, edgeId, edgePatch);

    return { edgeId, currentAp: (actor?.isPlayer === true) ? nextAp : undefined };
  }

  async function handleSecureDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'SECURE_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requireInsideGround(actor, TAG);
    await requireInsideCellExists(gameId, pos.x, pos.y, TAG);

    const apCost = apCostFor(TAG);
    // ensureActorHasAp() happens inside persistDoorAtomic before the tx writes.

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x: pos.x, y: pos.y });
    const nextDoor = doorService.applySecure(curDoor);

    const { edgeId, currentAp } = await persistDoorAtomic({
      gameId,
      uid,
      actor,
      apCost,
      door: nextDoor,
    });

    const decorated = decorateDoorForResponse(nextDoor);
    const out = { ok: true, gameId, uid, edgeId, ...decorated, apCost };
    if (actor.isPlayer === true) out.currentAp = currentAp;
    return out;
  }

  async function handleBarricadeDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'BARRICADE_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requireInsideGround(actor, TAG);
    await requireInsideCellExists(gameId, pos.x, pos.y, TAG);

    const apCost = apCostFor(TAG);

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x: pos.x, y: pos.y });
    const nextDoor = doorService.applyBarricade(curDoor);

    const { edgeId, currentAp } = await persistDoorAtomic({
      gameId,
      uid,
      actor,
      apCost,
      door: nextDoor,
    });

    const decorated = decorateDoorForResponse(nextDoor);
    const out = { ok: true, gameId, uid, edgeId, ...decorated, apCost };
    if (actor.isPlayer === true) out.currentAp = currentAp;
    return out;
  }

  async function handleDebarricadeDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'DEBARRICADE_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requireInsideGround(actor, TAG);
    await requireInsideCellExists(gameId, pos.x, pos.y, TAG);

    const apCost = apCostFor(TAG);

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x: pos.x, y: pos.y });
    const nextDoor = doorService.applyDebarricade(curDoor);

    const { edgeId, currentAp } = await persistDoorAtomic({
      gameId,
      uid,
      actor,
      apCost,
      door: nextDoor,
    });

    const decorated = decorateDoorForResponse(nextDoor);
    const out = { ok: true, gameId, uid, edgeId, ...decorated, apCost };
    if (actor.isPlayer === true) out.currentAp = currentAp;
    return out;
  }

  async function handleRepairDoor({ gameId = 'lockdown2030', uid }) {
    const TAG = 'REPAIR_DOOR';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requireInsideGround(actor, TAG);
    await requireInsideCellExists(gameId, pos.x, pos.y, TAG);

    const apCost = apCostFor(TAG);

    const curDoor = await doorService.loadDoorOrDefault({ gameId, x: pos.x, y: pos.y });
    const nextDoor = doorService.applyRepair(curDoor);

    const { edgeId, currentAp } = await persistDoorAtomic({
      gameId,
      uid,
      actor,
      apCost,
      door: nextDoor,
    });

    const decorated = decorateDoorForResponse(nextDoor);
    const out = { ok: true, gameId, uid, edgeId, ...decorated, apCost };
    if (actor.isPlayer === true) out.currentAp = currentAp;
    return out;
  }

  return {
    handleSecureDoor,
    handleBarricadeDoor,
    handleDebarricadeDoor,
    handleRepairDoor,
  };
}

module.exports = { makeDoorHandlers };
