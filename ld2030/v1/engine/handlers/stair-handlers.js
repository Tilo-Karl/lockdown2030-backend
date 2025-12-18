// Stair barricade action handlers (barricade/debarricade).
// Edge is per-building between floors.

const { STAIRS } = require('../../config/config-stairs');
const { getBuildingIndex } = require('../building-index');
const { makeStairService } = require('../stair-service');

function makeStairHandlers({ reader, writer, stairService: stairServiceIn }) {
  if (!reader) throw new Error('stair-handlers: reader is required');
  if (!writer) throw new Error('stair-handlers: writer is required');

  const stairService = stairServiceIn || makeStairService({ reader });

  function requireInside(actor, tag) {
    if (actor?.isInsideBuilding !== true) throw new Error(`${tag}: must_be_inside_building`);
  }

  function requireValidXYZ(actor, tag) {
    const pos = actor?.pos || {};
    const x = Number(pos.x);
    const y = Number(pos.y);
    const z = Number.isFinite(pos.z) ? Number(pos.z) : 0;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error(`${tag}: invalid_pos`);
    return { x, y, z };
  }

  function requireStep(dz, tag) {
    const step = Number(dz);
    if (!Number.isFinite(step) || (step !== 1 && step !== -1)) throw new Error(`${tag}: dz_must_be_plus_or_minus_1`);
    return step;
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
    const { byXY, byId } = getBuildingIndex(game, mapMeta);

    return { game, actor, byXY, byId };
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

  async function persistEdge(gameId, buildingId, zFrom, zTo, e) {
    const edgeId = stairService.edgeIdFor(buildingId, zFrom, zTo);
    await writer.updateStairEdge(gameId, edgeId, {
      edgeId,
      buildingId: String(buildingId || ''),
      zLo: Number(e?.zLo),
      zHi: Number(e?.zHi),
      barricadeLevel: Number.isFinite(e?.barricadeLevel) ? Number(e.barricadeLevel) : 0,
      broken: e?.broken === true,
      hp: Number.isFinite(e?.hp) ? Number(e.hp) : 0,
    });
    return edgeId;
  }

  async function handleBarricadeStairs({ gameId = 'lockdown2030', uid, dz }) {
    const TAG = 'BARRICADE_STAIRS';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const step = requireStep(dz, TAG);
    const { actor, byXY, byId } = await loadGameActorAndIndex({ gameId, uid, tag: TAG });
    requireInside(actor, TAG);

    const { x, y, z } = requireValidXYZ(actor, TAG);
    const buildingId = requireOnBuildingTile(byXY, x, y, TAG);

    const building = byId.get(buildingId) || null;
    const floors = Number.isFinite(building?.floors) ? Number(building.floors) : 1;

    const nextZ = z + step;
    if (nextZ < 0) throw new Error(`${TAG}: cannot_go_below_0`);
    if (nextZ > (floors - 1)) throw new Error(`${TAG}: floor_out_of_range`);

    const apCost = Number.isFinite(STAIRS.BARRICADE_AP_COST) ? Number(STAIRS.BARRICADE_AP_COST) : 1;
    const { nextAp } = await spendApIfPlayer({ gameId, uid, actor, apCost, tag: TAG });

    const curEdge = await stairService.loadEdgeOrDefault({ gameId, buildingId, zFrom: z, zTo: nextZ });
    const nextEdge = stairService.applyBarricade(curEdge);

    const edgeId = await persistEdge(gameId, buildingId, z, nextZ, nextEdge);

    return { ok: true, gameId, uid, edgeId, ...nextEdge, apCost, currentAp: nextAp };
  }

  async function handleDebarricadeStairs({ gameId = 'lockdown2030', uid, dz }) {
    const TAG = 'DEBARRICADE_STAIRS';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const step = requireStep(dz, TAG);
    const { actor, byXY, byId } = await loadGameActorAndIndex({ gameId, uid, tag: TAG });
    requireInside(actor, TAG);

    const { x, y, z } = requireValidXYZ(actor, TAG);
    const buildingId = requireOnBuildingTile(byXY, x, y, TAG);

    const building = byId.get(buildingId) || null;
    const floors = Number.isFinite(building?.floors) ? Number(building.floors) : 1;

    const nextZ = z + step;
    if (nextZ < 0) throw new Error(`${TAG}: cannot_go_below_0`);
    if (nextZ > (floors - 1)) throw new Error(`${TAG}: floor_out_of_range`);

    const apCost = Number.isFinite(STAIRS.DEBARRICADE_AP_COST) ? Number(STAIRS.DEBARRICADE_AP_COST) : 1;
    const { nextAp } = await spendApIfPlayer({ gameId, uid, actor, apCost, tag: TAG });

    const curEdge = await stairService.loadEdgeOrDefault({ gameId, buildingId, zFrom: z, zTo: nextZ });
    const nextEdge = stairService.applyDebarricade(curEdge);

    const edgeId = await persistEdge(gameId, buildingId, z, nextZ, nextEdge);

    return { ok: true, gameId, uid, edgeId, ...nextEdge, apCost, currentAp: nextAp };
  }

  return {
    handleBarricadeStairs,
    handleDebarricadeStairs,
  };
}

module.exports = { makeStairHandlers };