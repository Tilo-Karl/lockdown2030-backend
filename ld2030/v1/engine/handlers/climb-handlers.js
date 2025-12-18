// ld2030/v1/engine/handlers/climb-handlers.js
// CLIMB_IN / CLIMB_OUT actions (Quarantine-ish).
// - Climb bypasses secured/barricaded doors.
// - Ground floor only.
// - CLIMB_OUT triggers the "auto-unsecure chair" rule when leaving (if no barricade).

const { DOOR } = require('../../config');
const { getBuildingIndex } = require('../building-index');
const { makeDoorService } = require('../door-service');

function makeClimbHandlers({ reader, writer }) {
  if (!reader) throw new Error('climb-handlers: reader is required');
  if (!writer) throw new Error('climb-handlers: writer is required');

  const doorService = makeDoorService({ reader });

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  async function handleClimbIn({ gameId = 'lockdown2030', uid }) {
    if (!uid) throw new Error('CLIMB_IN: uid is required');

    const game = await reader.getGame(gameId);
    if (!game) throw new Error('CLIMB_IN: game_not_found');

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error('CLIMB_IN: actor_not_found');

    if (actor.isInsideBuilding === true) throw new Error('CLIMB_IN: already_inside');

    const pos = actor.pos || { x: 0, y: 0, z: 0 };
    const x = num(pos.x);
    const y = num(pos.y);
    const z = Number.isFinite(pos.z) ? Number(pos.z) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('CLIMB_IN: invalid_pos');
    if (z !== 0) throw new Error('CLIMB_IN: must_be_ground_floor');

    const mapMeta = game?.mapMeta || {};
    const { byXY } = getBuildingIndex(game, mapMeta);
    const buildingId = byXY.get(`${x},${y}`) || null;
    if (!buildingId) throw new Error('CLIMB_IN: must_be_on_building_tile');

    const apCost = Number(DOOR.CLIMB_IN_AP_COST || 0);
    const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
    if (actor.isPlayer === true && curAp < apCost) throw new Error('CLIMB_IN: not_enough_ap');
    const nextAp = actor.isPlayer === true ? Math.max(0, curAp - apCost) : curAp;

    await writer.updatePlayer(gameId, uid, {
      pos: { x, y, z: 0 },
      isInsideBuilding: true,
      ...(actor.isPlayer === true ? { currentAp: nextAp } : {}),
    });

    return { ok: true, gameId, uid, pos: { x, y, z: 0 }, isInsideBuilding: true, apCost, currentAp: nextAp };
  }

  async function handleClimbOut({ gameId = 'lockdown2030', uid }) {
    if (!uid) throw new Error('CLIMB_OUT: uid is required');

    const game = await reader.getGame(gameId);
    if (!game) throw new Error('CLIMB_OUT: game_not_found');

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error('CLIMB_OUT: actor_not_found');

    if (actor.isInsideBuilding !== true) throw new Error('CLIMB_OUT: must_be_inside_building');

    const pos = actor.pos || { x: 0, y: 0, z: 0 };
    const x = num(pos.x);
    const y = num(pos.y);
    const z = Number.isFinite(pos.z) ? Number(pos.z) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('CLIMB_OUT: invalid_pos');
    if (z !== 0) throw new Error('CLIMB_OUT: must_be_ground_floor');

    const apCost = Number(DOOR.CLIMB_OUT_AP_COST || 0);
    const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
    if (actor.isPlayer === true && curAp < apCost) throw new Error('CLIMB_OUT: not_enough_ap');
    const nextAp = actor.isPlayer === true ? Math.max(0, curAp - apCost) : curAp;

    // Outside is always z=0
    await writer.updatePlayer(gameId, uid, {
      pos: { x, y, z: 0 },
      isInsideBuilding: false,
      ...(actor.isPlayer === true ? { currentAp: nextAp } : {}),
    });

    // Quarantine rule: if this tile has a building footprint and only "chair-secure" (no barricade),
    // leaving makes it unsecured automatically.
    const mapMeta = game?.mapMeta || {};
    const { byXY } = getBuildingIndex(game, mapMeta);
    const buildingId = byXY.get(`${x},${y}`) || null;

    if (buildingId) {
      const d = await doorService.readDoorMerged(gameId, x, y);
      const lvl = Number.isFinite(d.barricadeLevel) ? d.barricadeLevel : 0;
      if (lvl <= 0 && d.isSecured === true) {
        await writer.updateDoor(gameId, doorService.doorIdForTile(x, y), {
          doorId: doorService.doorIdForTile(x, y),
          x,
          y,
          isSecured: false,
          isOpen: false,
          broken: d.broken === true,
          barricadeLevel: 0,
          hp: 0,
        });
      }
    }

    return { ok: true, gameId, uid, pos: { x, y, z: 0 }, isInsideBuilding: false, apCost, currentAp: nextAp };
  }

  return { handleClimbIn, handleClimbOut };
}

module.exports = { makeClimbHandlers };