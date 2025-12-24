// ld2030/v1/engine/handlers/climb-handlers.js
// CLIMB_IN / CLIMB_OUT actions.
// - Climb bypasses doors.
// - Ground floor only.
// - Uses runtime truth: inside-cell existence at (x,y,0,1).
//
// AP is centralized via ap-service.
// For CLIMB_OUT, optional door unsecure is written ATOMIC with AP using updateActorAndEdgeAtomic.

const { apCostFor, ensureActorHasAp } = require('../../actions/ap-service');
const { requirePos, cellIdFor } = require('../../actions/validators');
const { makeDoorService } = require('../door-service');

function makeClimbHandlers({ reader, writer, doorService: doorServiceIn } = {}) {
  if (!reader) throw new Error('climb-handlers: reader is required');
  if (!writer) throw new Error('climb-handlers: writer is required');

  const doorService = doorServiceIn || makeDoorService({ reader });

  async function requireBuildingTile(gameId, x, y, tag) {
    const inside = await reader.getCell(gameId, cellIdFor(x, y, 0, 1));
    if (!inside) throw new Error(`${tag}: must_be_on_building_tile`);
  }

  async function handleClimbIn({ gameId = 'lockdown2030', uid }) {
    const TAG = 'CLIMB_IN';
    if (!uid) throw new Error(`${TAG}: uid_required`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requirePos(actor, TAG);
    if (pos.layer !== 0) throw new Error(`${TAG}: not_outside`);
    if (pos.z !== 0) throw new Error(`${TAG}: must_be_ground_floor`);

    await requireBuildingTile(gameId, pos.x, pos.y, TAG);

    const apCost = apCostFor(TAG);
    const { nextAp } = ensureActorHasAp(actor, apCost, TAG);

    const patch = {
      pos: { x: pos.x, y: pos.y, z: 0, layer: 1 },
      ...(actor.isPlayer === true ? { currentAp: nextAp } : {}),
    };

    // actor-only write is already transactional
    await writer.updateActor(gameId, uid, patch);

    const out = {
      ok: true,
      gameId,
      uid,
      pos: { x: pos.x, y: pos.y, z: 0, layer: 1 },
      apCost,
    };
    if (actor.isPlayer === true) out.currentAp = nextAp;
    return out;
  }

  async function handleClimbOut({ gameId = 'lockdown2030', uid }) {
    const TAG = 'CLIMB_OUT';
    if (!uid) throw new Error(`${TAG}: uid_required`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requirePos(actor, TAG);
    if (pos.layer !== 1) throw new Error(`${TAG}: not_inside`);
    if (pos.z !== 0) throw new Error(`${TAG}: must_be_ground_floor`);

    await requireBuildingTile(gameId, pos.x, pos.y, TAG);

    const apCost = apCostFor(TAG);
    const { nextAp } = ensureActorHasAp(actor, apCost, TAG);

    const actorPatch = {
      pos: { x: pos.x, y: pos.y, z: 0, layer: 0 },
      ...(actor.isPlayer === true ? { currentAp: nextAp } : {}),
    };

    // Auto-unsecure on exit if NO barricade levels exist.
    const d = await doorService.loadDoorOrDefault({ gameId, x: pos.x, y: pos.y });
    const lvl = Number.isFinite(d.barricadeLevel) ? Number(d.barricadeLevel) : 0;

    if (lvl <= 0 && d.isSecured === true) {
      if (typeof writer.updateActorAndEdgeAtomic !== 'function') {
        throw new Error('CLIMB_OUT: writer.updateActorAndEdgeAtomic is required for atomic unsecure');
      }

      const edgeId = doorService.doorEdgeIdForTile(pos.x, pos.y);
      const edgePatch = {
        kind: 'door',
        isSecured: false,
        ...(d.isDestroyed === true ? {} : { isOpen: false }),
      };

      await writer.updateActorAndEdgeAtomic(gameId, uid, actorPatch, edgeId, edgePatch);
    } else {
      await writer.updateActor(gameId, uid, actorPatch);
    }

    const out = {
      ok: true,
      gameId,
      uid,
      pos: { x: pos.x, y: pos.y, z: 0, layer: 0 },
      apCost,
    };
    if (actor.isPlayer === true) out.currentAp = nextAp;
    return out;
  }

  return { handleClimbIn, handleClimbOut };
}

module.exports = { makeClimbHandlers };