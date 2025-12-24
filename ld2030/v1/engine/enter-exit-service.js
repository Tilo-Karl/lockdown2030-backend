// ld2030/v1/engine/enter-exit-service.js
// Enter/Exit rules using runtime truth ONLY (edges/* + actor.pos).
//
// Master-plan:
// - inside/outside is represented by pos.layer (0=outside, 1=inside)
// - pos is ALWAYS { x, y, z, layer }
// - doors are edges/* kind='door' with Big Bang e_* id (outside<->inside)
//
// Notes:
// - We DO NOT global-force outside z=0.
// - For DOOR gating, we use the existing door-edge truth (currently ground door: z=0 on both ends).
// - Exiting a building through a door requires inside z === 0 (use stairs for upper floors).

const { makeDoorService } = require('./door-service');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function isValidLayer(v) {
  return Number.isInteger(v) && (v === 0 || v === 1);
}

function hasValidPos(p) {
  return (
    p &&
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    Number.isInteger(p.z) &&
    isValidLayer(p.layer)
  );
}

function clampPosToGrid(pos, w, h) {
  return {
    x: Math.min(Math.max(nInt(pos.x, 0), 0), Math.max(0, w - 1)),
    y: Math.min(Math.max(nInt(pos.y, 0), 0), Math.max(0, h - 1)),
    z: Math.max(0, nInt(pos.z, 0)),
    layer: pos.layer,
  };
}

function pickActorUpdater(writer, actor) {
  if (!writer) throw new Error('ENTER_EXIT: missing_writer');

  // Prefer explicit isPlayer discriminator.
  if (actor?.isPlayer === true && typeof writer.updatePlayer === 'function') {
    return writer.updatePlayer.bind(writer);
  }

  // Zombies
  if (actor?.type === 'ZOMBIE' && typeof writer.updateZombie === 'function') {
    return writer.updateZombie.bind(writer);
  }

  // Optional (only if your writer supports it)
  if (actor?.type === 'HUMAN' && actor?.isPlayer !== true && typeof writer.updateHuman === 'function') {
    return writer.updateHuman.bind(writer);
  }

  throw new Error('ENTER_EXIT: no_update_fn_for_actor');
}

function makeEnterExitService({ reader, writer } = {}) {
  if (!reader) throw new Error('ENTER_EXIT: missing_reader');

  const doors = makeDoorService({ reader });

  // Door edges today are outside(z=0,layer=0) <-> inside(z=0,layer=1).
  // We intentionally ignore OUTSIDE z for gating (outside z is "don’t care" right now).
  async function assertDoorAllowsEnter({ gameId, x, y }) {
    const d = await doors.loadDoorOrDefault({ gameId, x, y });
    if (doors.isEnterBlockedFromOutside(d)) {
      throw new Error('ENTER: blocked_by_door');
    }
    return d;
  }

  async function enterFromOutside({ gameId, actorId, actor, gridSize }) {
    if (!gameId || !actorId) throw new Error('ENTER: missing_ids');
    if (!actor || !hasValidPos(actor.pos)) throw new Error('ENTER: actor_pos_invalid');

    const w = nInt(gridSize?.w, 0);
    const h = nInt(gridSize?.h, 0);

    // Must be outside.
    if (actor.pos.layer !== 0) throw new Error('ENTER: not_outside');

    const x = nInt(actor.pos.x, 0);
    const y = nInt(actor.pos.y, 0);

    await assertDoorAllowsEnter({ gameId, x, y });

    const nextPos = clampPosToGrid({ x, y, z: 0, layer: 1 }, w, h);

    const updateFn = pickActorUpdater(writer, actor);
    await updateFn(gameId, actorId, { pos: nextPos });

    return { pos: nextPos };
  }

  async function exitToOutside({ gameId, actorId, actor, gridSize }) {
    if (!gameId || !actorId) throw new Error('EXIT: missing_ids');
    if (!actor || !hasValidPos(actor.pos)) throw new Error('EXIT: actor_pos_invalid');

    const w = nInt(gridSize?.w, 0);
    const h = nInt(gridSize?.h, 0);

    // Must be inside.
    if (actor.pos.layer !== 1) throw new Error('EXIT: not_inside');

    // Door exit only from ground inside (upper floors require stairs first).
    if (nInt(actor.pos.z, 0) !== 0) throw new Error('EXIT: must_use_stairs');

    const x = nInt(actor.pos.x, 0);
    const y = nInt(actor.pos.y, 0);

    // We do NOT require the door to be open for exiting (master plan: leaving drops secure).
    // But we still load the door edge so callers can apply door-service patching if desired.
    // (This service only moves the actor.)
    await doors.loadDoorOrDefault({ gameId, x, y });

    const nextPos = clampPosToGrid({ x, y, z: 0, layer: 0 }, w, h);

    const updateFn = pickActorUpdater(writer, actor);
    await updateFn(gameId, actorId, { pos: nextPos });

    return { pos: nextPos };
  }

  // Utility: given an actor, tell whether they are logically inside/outside.
  function whereIs(actor) {
    if (!actor || !hasValidPos(actor.pos)) return 'unknown';
    return actor.pos.layer === 1 ? 'inside' : 'outside';
  }

  return {
    hasValidPos,
    enterFromOutside,
    exitToOutside,
    whereIs,
  };
}

module.exports = { makeEnterExitService };