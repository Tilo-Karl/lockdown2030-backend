// ld2030/v1/engine/engine.js
// Core game logic. No legacy paths.
// Engine coordinates rules + services, does not do Firestore transactions itself.

const { makeEquipmentService } = require('./equipment-service');
const { planMove } = require('./move-rules');
const { getBuildingIndex } = require('./building-index');

function makeEngine({ reader, writer }) {
  if (!reader) throw new Error('engine: reader is required');
  if (!writer) throw new Error('engine: writer is required');

  const equipmentService = makeEquipmentService({ reader, writer });

  function doorIdForTile(x, y) {
    return `d_${x}_${y}`;
  }

  function doorDefaults(x, y) {
    return {
      doorId: doorIdForTile(x, y),
      x,
      y,
      isOpen: false,
      isSecured: false,
      barricadeLevel: 0,
      broken: false,
      hp: 0,
    };
  }

  async function processAction(action) {
    switch (action.type) {
      case 'MOVE':
        return handleMove(action);
      case 'SEARCH':
        return handleSearch(action);
      case 'ENTER_BUILDING':
        return handleEnterBuilding(action);
      case 'STAIRS':
        return handleStairs(action);
      case 'CLIMB_IN':
        return handleClimbIn(action);
      case 'CLIMB_OUT':
        return handleClimbOut(action);
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

    // caching lives outside rules
    const mapMeta = game?.mapMeta || {};
    const { byXY } = getBuildingIndex(game, mapMeta);

    const plan = planMove({ game, actor, dx, dy, byXY });
    if (!plan.ok) throw new Error(`MOVE: ${plan.reason}`);

    const nextPos = plan.to;
    const nextInside = plan.isInsideBuilding === true;

    // AP gate: only player actors spend AP
    if (actor.isPlayer === true) {
      const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
      if (curAp < plan.apCost) throw new Error('MOVE: not_enough_ap');
      const nextAp = Math.max(0, curAp - plan.apCost);

      await writer.updatePlayer(gameId, uid, {
        pos: nextPos,
        isInsideBuilding: nextInside,
        currentAp: nextAp,
      });

      // If this move caused an implicit EXIT, auto-unsecure the door on the tile you exited from.
      if (actor.isInsideBuilding === true && nextInside === false) {
        const fx = Number(plan.from?.x);
        const fy = Number(plan.from?.y);
        if (Number.isFinite(fx) && Number.isFinite(fy)) {
          const buildingId = byXY.get(`${fx},${fy}`) || null;
          if (buildingId) {
            await writer.updateDoor(gameId, doorIdForTile(fx, fy), {
              x: fx,
              y: fy,
              isSecured: false,
            });
          }
        }
      }

      return {
        ok: true,
        gameId,
        uid,
        pos: nextPos,
        isInsideBuilding: nextInside,
        apCost: plan.apCost,
        currentAp: nextAp,
      };
    }

    // Non-player move (no AP gate yet)
    await writer.updatePlayer(gameId, uid, {
      pos: nextPos,
      isInsideBuilding: nextInside,
    });

    return { ok: true, gameId, uid, pos: nextPos, isInsideBuilding: nextInside, apCost: plan.apCost };
  }

  async function handleEnterBuilding({ gameId = 'lockdown2030', uid }) {
    if (!uid) throw new Error('ENTER_BUILDING: uid is required');

    const game = await reader.getGame(gameId);
    if (!game) throw new Error('ENTER_BUILDING: game_not_found');

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error('ENTER_BUILDING: actor_not_found');

    if (actor.isInsideBuilding === true) throw new Error('ENTER_BUILDING: already_inside');

    const pos = actor.pos || { x: 0, y: 0, z: 0 };
    const x = Number(pos.x);
    const y = Number(pos.y);
    const z = Number.isFinite(pos.z) ? Number(pos.z) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('ENTER_BUILDING: invalid_pos');

    // Outside must enter at ground floor
    if (z !== 0) throw new Error('ENTER_BUILDING: must_be_ground_floor');

    const mapMeta = game?.mapMeta || {};
    const { byXY } = getBuildingIndex(game, mapMeta);

    const buildingId = byXY.get(`${x},${y}`) || null;
    if (!buildingId) throw new Error('ENTER_BUILDING: must_be_on_building_tile');

    // Door gate (Quarantine model): secured/barricaded blocks entering from outside.
    const doorId = doorIdForTile(x, y);
    const door = (typeof reader.getDoor === 'function')
      ? (await reader.getDoor(gameId, doorId))
      : null;

    const d = door ? { ...doorDefaults(x, y), ...door } : doorDefaults(x, y);

    // broken doors are effectively open: allow enter
    const barricadeLevel = Number.isFinite(d.barricadeLevel) ? Number(d.barricadeLevel) : 0;
    const isBlocked = d.broken === true ? false : (d.isSecured === true || barricadeLevel > 0);
    if (isBlocked) throw new Error('ENTER_BUILDING: must_climb_in');

    const apCost = 1;
    const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
    if (curAp < apCost) throw new Error('ENTER_BUILDING: not_enough_ap');
    const nextAp = Math.max(0, curAp - apCost);

    await writer.updatePlayer(gameId, uid, {
      pos: { x, y, z: 0 },
      isInsideBuilding: true,
      currentAp: nextAp,
    });

    return { ok: true, gameId, uid, pos: { x, y, z: 0 }, isInsideBuilding: true, apCost, currentAp: nextAp };
  }

  async function handleStairs({ gameId = 'lockdown2030', uid, dz }) {
    if (!uid) throw new Error('STAIRS: uid is required');

    const step = Number(dz);
    if (!Number.isFinite(step) || (step !== 1 && step !== -1)) {
      throw new Error('STAIRS: dz_must_be_plus_or_minus_1');
    }

    const game = await reader.getGame(gameId);
    if (!game) throw new Error('STAIRS: game_not_found');

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error('STAIRS: actor_not_found');

    if (actor.isInsideBuilding !== true) throw new Error('STAIRS: must_be_inside_building');

    const pos = actor.pos || { x: 0, y: 0, z: 0 };
    const x = Number(pos.x);
    const y = Number(pos.y);
    const z = Number.isFinite(pos.z) ? Number(pos.z) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('STAIRS: invalid_pos');

    const mapMeta = game?.mapMeta || {};
    const { byXY, byId } = getBuildingIndex(game, mapMeta);

    const buildingId = byXY.get(`${x},${y}`) || null;
    if (!buildingId) throw new Error('STAIRS: not_on_building_tile');

    const building = byId.get(buildingId) || null;
    const floors = Number.isFinite(building?.floors) ? Number(building.floors) : 1;

    const nextZ = z + step;
    if (nextZ < 0) throw new Error('STAIRS: cannot_go_below_0');
    if (nextZ > (floors - 1)) throw new Error('STAIRS: floor_out_of_range');

    const apCost = 1;
    const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
    if (curAp < apCost) throw new Error('STAIRS: not_enough_ap');
    const nextAp = Math.max(0, curAp - apCost);

    await writer.updatePlayer(gameId, uid, {
      pos: { x, y, z: nextZ },
      isInsideBuilding: true,
      currentAp: nextAp,
    });

    return { ok: true, gameId, uid, pos: { x, y, z: nextZ }, isInsideBuilding: true, apCost, currentAp: nextAp };
  }

  async function handleClimbIn({ gameId = 'lockdown2030', uid }) {
    if (!uid) throw new Error('CLIMB_IN: uid is required');

    const game = await reader.getGame(gameId);
    if (!game) throw new Error('CLIMB_IN: game_not_found');

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error('CLIMB_IN: actor_not_found');

    if (actor.isInsideBuilding === true) throw new Error('CLIMB_IN: already_inside');

    const pos = actor.pos || { x: 0, y: 0, z: 0 };
    const x = Number(pos.x);
    const y = Number(pos.y);
    const z = Number.isFinite(pos.z) ? Number(pos.z) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('CLIMB_IN: invalid_pos');
    if (z !== 0) throw new Error('CLIMB_IN: must_be_ground_floor');

    const mapMeta = game?.mapMeta || {};
    const { byXY } = getBuildingIndex(game, mapMeta);
    const buildingId = byXY.get(`${x},${y}`) || null;
    if (!buildingId) throw new Error('CLIMB_IN: must_be_on_building_tile');

    const apCost = 2;
    const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
    if (curAp < apCost) throw new Error('CLIMB_IN: not_enough_ap');
    const nextAp = Math.max(0, curAp - apCost);

    await writer.updatePlayer(gameId, uid, {
      pos: { x, y, z: 0 },
      isInsideBuilding: true,
      currentAp: nextAp,
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
    const x = Number(pos.x);
    const y = Number(pos.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('CLIMB_OUT: invalid_pos');

    const apCost = 1;
    const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
    if (curAp < apCost) throw new Error('CLIMB_OUT: not_enough_ap');
    const nextAp = Math.max(0, curAp - apCost);

    // Outside is always z=0
    await writer.updatePlayer(gameId, uid, {
      pos: { x, y, z: 0 },
      isInsideBuilding: false,
      currentAp: nextAp,
    });

    return { ok: true, gameId, uid, pos: { x, y, z: 0 }, isInsideBuilding: false, apCost, currentAp: nextAp };
  }

  async function handleSearch({ gameId = 'lockdown2030', uid }) {
    if (!uid) throw new Error('SEARCH: uid is required');

    const game = await reader.getGame(gameId);
    if (!game) throw new Error('SEARCH: game_not_found');

    const actor = await reader.getPlayer(gameId, uid);
    if (!actor) throw new Error('SEARCH: actor_not_found');

    if (actor.isInsideBuilding !== true) throw new Error('SEARCH: must_be_inside_building');

    const pos = actor.pos || { x: 0, y: 0, z: 0 };
    const x = Number(pos.x);
    const y = Number(pos.y);
    const z = Number.isFinite(pos.z) ? Number(pos.z) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('SEARCH: invalid_pos');

    const apCost = 1;
    const curAp = Number.isFinite(actor.currentAp) ? actor.currentAp : 0;
    if (curAp < apCost) throw new Error('SEARCH: not_enough_ap');

    const spotId = `i_${x}_${y}_${z}`;

    return writer.searchSpot({
      gameId,
      uid,
      spotId,
      pos: { x, y, z },
      isInsideBuilding: true,
      apCost,
      defaultRemaining: 3,
    });
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