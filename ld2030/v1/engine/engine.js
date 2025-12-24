// ld2030/v1/engine/engine.js
// Core game logic (V1).
//
// MASTER PLAN (LOCKED):
// - Big Bang truth: actor.pos is ALWAYS { x, y, z, layer } where layer ∈ {0,1}
// - NO legacy fields (NO actor.isInsideBuilding fallback).
// - Runtime truth comes from cells/* + edges/* (no mapMeta truth paths).
// - Engine coordinates rules + services, but does not implement HTTP routing.

const { makeEquipmentService } = require('./equipment-service');

const { makeDoorService } = require('./door-service');
const { makeDoorHandlers } = require('./handlers/door-handlers');
const { makeClimbHandlers } = require('./handlers/climb-handlers');
const { makeStandHandlers } = require('./handlers/stand-handlers');

const { makeStairService } = require('./stair-service');
const { makeStairHandlers } = require('./handlers/stair-handlers');

// NEW
const { makeRepairHandlers } = require('./handlers/repair-handlers');

function nIntStrict(x, tag) {
  const v = Number(x);
  if (!Number.isFinite(v)) throw new Error(tag);
  return Math.trunc(v);
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function cellId(x, y, z, layer) {
  return `c_${x}_${y}_${z}_${layer}`;
}

function requirePos(actor, tag) {
  const p = actor?.pos;
  if (!p || typeof p !== 'object') throw new Error(`${tag}: missing_pos`);

  const x = nIntStrict(p.x, `${tag}: pos_x_invalid`);
  const y = nIntStrict(p.y, `${tag}: pos_y_invalid`);
  const z = nIntStrict(p.z, `${tag}: pos_z_invalid`);
  const layer = nIntStrict(p.layer, `${tag}: pos_layer_missing`);

  if (layer !== 0 && layer !== 1) throw new Error(`${tag}: pos_layer_invalid`);

  return { x, y, z, layer };
}

function makeEngine({ reader, writer }) {
  if (!reader) throw new Error('engine: reader is required');
  if (!writer) throw new Error('engine: writer is required');

  // Services / handlers (engine owns wiring; router owns dispatch)
  const equipmentService = makeEquipmentService({ reader, writer });

  const doorService = makeDoorService({ reader });
  const doorHandlers = makeDoorHandlers({ reader, writer, doorService });

  const stairService = makeStairService({ reader });
  const stairHandlers = makeStairHandlers({ reader, writer, stairService });

  const climbHandlers = makeClimbHandlers({ reader, writer, doorService });
  const standHandlers = makeStandHandlers({ reader, writer });

  // NEW: repair handlers (inside cells)
  const repairHandlers = makeRepairHandlers({ reader, writer });

  async function move({ gameId = 'lockdown2030', uid, dx = 0, dy = 0 }) {
    const TAG = 'MOVE';
    if (!uid) throw new Error(`${TAG}: uid_required`);

    const game = await reader.getGame(gameId);
    if (!game) throw new Error(`${TAG}: game_not_found`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requirePos(actor, TAG);

    const stepX = nIntStrict(dx, `${TAG}: dx_invalid`);
    const stepY = nIntStrict(dy, `${TAG}: dy_invalid`);
    if (stepX === 0 && stepY === 0) throw new Error(`${TAG}: zero_step`);
    if (Math.abs(stepX) + Math.abs(stepY) !== 1) throw new Error(`${TAG}: invalid_step`);

    const gs = game.gridsize || {};
    const W = Number.isFinite(gs.w ?? game.w) ? nIntStrict(gs.w ?? game.w, `${TAG}: grid_w_invalid`) : 0;
    const H = Number.isFinite(gs.h ?? game.h) ? nIntStrict(gs.h ?? game.h, `${TAG}: grid_h_invalid`) : 0;
    if (W <= 0 || H <= 0) throw new Error(`${TAG}: invalid_grid`);

    const nextX = clamp(pos.x + stepX, 0, W - 1);
    const nextY = clamp(pos.y + stepY, 0, H - 1);

    // Runtime truth: movement stays on SAME z/layer plane.
    const targetCellId = cellId(nextX, nextY, pos.z, pos.layer);
    const targetCell = await reader.getCell(gameId, targetCellId);
    if (!targetCell) throw new Error(`${TAG}: target_cell_missing`);
    if (targetCell.blocksMove === true) throw new Error(`${TAG}: blocked`);

    const apCost = Number.isFinite(targetCell.moveCost) ? Math.trunc(targetCell.moveCost) : 1;

    const nextPos = { x: nextX, y: nextY, z: pos.z, layer: pos.layer };

    if (actor.isPlayer === true) {
      const curAp = Number.isFinite(actor.currentAp) ? Math.trunc(actor.currentAp) : 0;
      if (curAp < apCost) throw new Error(`${TAG}: not_enough_ap`);
      const nextAp = Math.max(0, curAp - apCost);

      await writer.updateActor(gameId, uid, { pos: nextPos, currentAp: nextAp });
      return { ok: true, gameId, uid, pos: nextPos, apCost, currentAp: nextAp };
    }

    await writer.updateActor(gameId, uid, { pos: nextPos });
    return { ok: true, gameId, uid, pos: nextPos, apCost };
  }

  async function enterBuilding({ gameId = 'lockdown2030', uid }) {
    const TAG = 'ENTER_BUILDING';
    if (!uid) throw new Error(`${TAG}: uid_required`);

    const game = await reader.getGame(gameId);
    if (!game) throw new Error(`${TAG}: game_not_found`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requirePos(actor, TAG);

    if (pos.layer !== 0) throw new Error(`${TAG}: not_outside`);
    if (pos.z !== 0) throw new Error(`${TAG}: must_be_ground_floor`);

    // Runtime truth: inside cell must exist at (x,y,z=0,layer=1)
    const inside = await reader.getCell(gameId, cellId(pos.x, pos.y, 0, 1));
    if (!inside) throw new Error(`${TAG}: not_on_building_tile`);

    // Door gate (edges/* truth)
    const d = await doorService.loadDoorOrDefault({ gameId, x: pos.x, y: pos.y });
    if (doorService.isEnterBlockedFromOutside(d)) throw new Error(`${TAG}: must_climb_in`);

    const apCost = 1;
    const nextPos = { x: pos.x, y: pos.y, z: 0, layer: 1 };

    if (actor.isPlayer === true) {
      const curAp = Number.isFinite(actor.currentAp) ? Math.trunc(actor.currentAp) : 0;
      if (curAp < apCost) throw new Error(`${TAG}: not_enough_ap`);
      const nextAp = Math.max(0, curAp - apCost);

      await writer.updateActor(gameId, uid, { pos: nextPos, currentAp: nextAp });
      return { ok: true, gameId, uid, pos: nextPos, apCost, currentAp: nextAp };
    }

    await writer.updateActor(gameId, uid, { pos: nextPos });
    return { ok: true, gameId, uid, pos: nextPos, apCost };
  }

  async function stairs({ gameId = 'lockdown2030', uid, dz }) {
    const TAG = 'STAIRS';
    if (!uid) throw new Error(`${TAG}: uid_required`);

    const step = Number(dz);
    if (!Number.isFinite(step) || (step !== 1 && step !== -1)) throw new Error(`${TAG}: dz_invalid`);

    const game = await reader.getGame(gameId);
    if (!game) throw new Error(`${TAG}: game_not_found`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requirePos(actor, TAG);
    if (pos.layer !== 1) throw new Error(`${TAG}: not_inside`);

    // Runtime truth: current + target inside cells define valid floors
    const curCell = await reader.getCell(gameId, cellId(pos.x, pos.y, pos.z, 1));
    if (!curCell) throw new Error(`${TAG}: inside_cell_missing`);

    const nextZ = pos.z + step;
    if (nextZ < 0) throw new Error(`${TAG}: cannot_go_below_0`);

    const nextCell = await reader.getCell(gameId, cellId(pos.x, pos.y, nextZ, 1));
    if (!nextCell) throw new Error(`${TAG}: floor_out_of_range`);

    // Runtime truth: stairs barricade edge between floors
    const edge = await stairService.loadEdgeOrDefault({
      gameId,
      x: pos.x,
      y: pos.y,
      zFrom: pos.z,
      zTo: nextZ,
    });

    if (stairService.isBlocked(edge)) throw new Error(`${TAG}: blocked_by_barricade`);

    const apCost = 1;
    const nextPos = { x: pos.x, y: pos.y, z: nextZ, layer: 1 };

    if (actor.isPlayer === true) {
      const curAp = Number.isFinite(actor.currentAp) ? Math.trunc(actor.currentAp) : 0;
      if (curAp < apCost) throw new Error(`${TAG}: not_enough_ap`);
      const nextAp = Math.max(0, curAp - apCost);

      await writer.updateActor(gameId, uid, { pos: nextPos, currentAp: nextAp });
      return { ok: true, gameId, uid, pos: nextPos, apCost, currentAp: nextAp };
    }

    await writer.updateActor(gameId, uid, { pos: nextPos });
    return { ok: true, gameId, uid, pos: nextPos, apCost };
  }

  async function search({ gameId = 'lockdown2030', uid }) {
    const TAG = 'SEARCH';
    if (!uid) throw new Error(`${TAG}: uid_required`);

    const game = await reader.getGame(gameId);
    if (!game) throw new Error(`${TAG}: game_not_found`);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);

    const pos = requirePos(actor, TAG);
    if (pos.layer !== 1) throw new Error(`${TAG}: not_inside`);

    const apCost = 1;

    // SEARCH is player/AP-gated in V1 searchSpot writer contracts.
    if (actor.isPlayer !== true) throw new Error(`${TAG}: players_only`);

    const curAp = Number.isFinite(actor.currentAp) ? Math.trunc(actor.currentAp) : 0;
    if (curAp < apCost) throw new Error(`${TAG}: not_enough_ap`);

    const spotId = `i_${pos.x}_${pos.y}_${pos.z}_${pos.layer}`;

    return writer.searchSpot({
      gameId,
      uid,
      spotId,
      pos,
      apCost,
      defaultRemaining: 3,
    });
  }

  async function attackEntity({ gameId = 'lockdown2030', uid, targetId }) {
    const TAG = 'ATTACK_ENTITY';
    if (!uid) throw new Error(`${TAG}: uid_required`);
    if (!targetId) throw new Error(`${TAG}: targetId_required`);

    return writer.attackEntity({ gameId, attackerId: uid, targetId });
  }

  async function equipItem({ gameId = 'lockdown2030', uid, itemId }) {
    const TAG = 'EQUIP_ITEM';
    if (!uid) throw new Error(`${TAG}: uid_required`);
    if (!itemId) throw new Error(`${TAG}: itemId_required`);

    return equipmentService.equipItem({ gameId, actorId: uid, itemId });
  }

  async function unequipItem({ gameId = 'lockdown2030', uid, itemId }) {
    const TAG = 'UNEQUIP_ITEM';
    if (!uid) throw new Error(`${TAG}: uid_required`);
    if (!itemId) throw new Error(`${TAG}: itemId_required`);

    return equipmentService.unequipItem({ gameId, actorId: uid, itemId });
  }

  return {
    // Core action implementations (router dispatches to these)
    move,
    search,
    enterBuilding,
    stairs,
    attackEntity,
    equipItem,
    unequipItem,

    // Expose wired handlers (router dispatches to these)
    doorHandlers,
    stairHandlers,
    climbHandlers,
    standHandlers,

    // NEW
    repairHandlers,
  };
}

module.exports = { makeEngine };
