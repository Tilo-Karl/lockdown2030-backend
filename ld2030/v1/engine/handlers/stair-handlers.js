// ld2030/v1/engine/handlers/stair-handlers.js
// Stair barricade action handlers (barricade/debarricade).
// Persists ONLY runtime truth via edges/*.
// AP + edge write are ATOMIC via writer.updateActorAndEdgeAtomic.

const { apCostFor, ensureActorHasAp } = require('../../actions/ap-service');
const { requireInside, requireDzPlusMinus1, cellIdFor } = require('../../actions/validators');
const { makeStairService } = require('../stair-service');
const { integrityLabel } = require('../integrity');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function makeStairHandlers({ reader, writer, stairService: stairServiceIn }) {
  if (!reader) throw new Error('stair-handlers: reader is required');
  if (!writer) throw new Error('stair-handlers: writer is required');
  if (typeof writer.updateActorAndEdgeAtomic !== 'function') {
    throw new Error('stair-handlers: writer.updateActorAndEdgeAtomic is required');
  }

  const stairService = stairServiceIn || makeStairService({ reader });

  function requireValidXYZ(actor, tag) {
    const pos = actor?.pos || {};
    const x = nInt(pos.x, NaN);
    const y = nInt(pos.y, NaN);
    const z = nInt(pos.z, NaN);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) throw new Error(`${tag}: invalid_pos`);
    return { x, y, z };
  }

  function decorateForResponse(e) {
    const maxHp = Number.isFinite(e.barricadeMaxHp)
      ? Number(e.barricadeMaxHp)
      : stairService.maxHpForLevel(e.barricadeLevel);
    const label = integrityLabel({ hp: e.barricadeHp ?? 0, maxHp });
    return { ...e, barricadeMaxHp: maxHp, barricadeIntegrity: label };
  }

  async function assertCellsExist(gameId, x, y, zA, zB, tag) {
    const a = await reader.getCell(gameId, cellIdFor(x, y, zA, 1));
    if (!a) throw new Error(`${tag}: inside_cell_missing`);
    const b = await reader.getCell(gameId, cellIdFor(x, y, zB, 1));
    if (!b) throw new Error(`${tag}: floor_out_of_range`);
  }

  async function persistStairsEdgeAtomic({ gameId, uid, actor, apCost, edge }) {
    const { nextAp } = ensureActorHasAp(actor, apCost, 'AP');
    const actorPatch = (actor?.isPlayer === true) ? { currentAp: nextAp } : {};

    const edgePatch = {
      kind: 'stairs',
      // edgeId enforced by writer
      a: edge.a,
      b: edge.b,
      x: Number(edge.x),
      y: Number(edge.y),
      zLo: Number(edge.zLo),
      zHi: Number(edge.zHi),
      barricadeLevel: Number.isFinite(edge.barricadeLevel) ? Number(edge.barricadeLevel) : 0,
      barricadeHp: Number.isFinite(edge.barricadeHp) ? Math.max(0, Number(edge.barricadeHp)) : 0,
      barricadeMaxHp: Number.isFinite(edge.barricadeMaxHp) ? Math.max(0, Number(edge.barricadeMaxHp)) : 0,
    };

    await writer.updateActorAndEdgeAtomic(gameId, uid, actorPatch, edge.edgeId, edgePatch);

    return { edgeId: edge.edgeId, currentAp: (actor?.isPlayer === true) ? nextAp : undefined };
  }

  async function handleBarricadeStairs({ gameId = 'lockdown2030', uid, dz }) {
    const TAG = 'BARRICADE_STAIRS';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const step = requireDzPlusMinus1(dz, TAG);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);
    requireInside(actor, TAG);

    const { x, y, z } = requireValidXYZ(actor, TAG);
    const nextZ = z + step;
    if (nextZ < 0) throw new Error(`${TAG}: cannot_go_below_0`);

    await assertCellsExist(gameId, x, y, z, nextZ, TAG);

    const apCost = apCostFor(TAG);

    const curEdge = await stairService.loadEdgeOrDefault({ gameId, x, y, zFrom: z, zTo: nextZ });
    const nextEdge = stairService.applyBarricade(curEdge);

    const { edgeId, currentAp } = await persistStairsEdgeAtomic({
      gameId,
      uid,
      actor,
      apCost,
      edge: nextEdge,
    });

    const decorated = decorateForResponse(nextEdge);
    const out = { ok: true, gameId, uid, edgeId, ...decorated, apCost };
    if (actor.isPlayer === true) out.currentAp = currentAp;
    return out;
  }

  async function handleDebarricadeStairs({ gameId = 'lockdown2030', uid, dz }) {
    const TAG = 'DEBARRICADE_STAIRS';
    if (!uid) throw new Error(`${TAG}: uid is required`);

    const step = requireDzPlusMinus1(dz, TAG);

    const actor = await reader.getActor(gameId, uid);
    if (!actor) throw new Error(`${TAG}: actor_not_found`);
    requireInside(actor, TAG);

    const { x, y, z } = requireValidXYZ(actor, TAG);
    const nextZ = z + step;
    if (nextZ < 0) throw new Error(`${TAG}: cannot_go_below_0`);

    await assertCellsExist(gameId, x, y, z, nextZ, TAG);

    const apCost = apCostFor(TAG);

    const curEdge = await stairService.loadEdgeOrDefault({ gameId, x, y, zFrom: z, zTo: nextZ });
    const nextEdge = stairService.applyDebarricade(curEdge);

    const { edgeId, currentAp } = await persistStairsEdgeAtomic({
      gameId,
      uid,
      actor,
      apCost,
      edge: nextEdge,
    });

    const decorated = decorateForResponse(nextEdge);
    const out = { ok: true, gameId, uid, edgeId, ...decorated, apCost };
    if (actor.isPlayer === true) out.currentAp = currentAp;
    return out;
  }

  return {
    handleBarricadeStairs,
    handleDebarricadeStairs,
  };
}

module.exports = { makeStairHandlers };
