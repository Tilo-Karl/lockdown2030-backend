// ld2030/v1/engine/state-writer-spawn.js

const { resolveEntityConfig } = require('../entity');
const { parseCellId } = require('../world/cells');

module.exports = function makeSpawnStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-spawn: db is required');
  if (!admin) throw new Error('state-writer-spawn: admin is required');
  if (!state) throw new Error('state-writer-spawn: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();
  const { zombiesCol, humansCol, itemsCol } = state;

  // tmpl is FINAL. Spawner only adds spawn-only fields.
  function buildActorDocFromTemplate(tmpl, extra) {
    return {
      ...tmpl,
      ...extra,              // pos override etc
      createdAt: serverTs(),
      updatedAt: serverTs(),
    };
  }

  // tmpl is FINAL. Spawner only adds spawn-only fields.
  function buildItemDocFromTemplate(tmpl, extra) {
    return {
      ...tmpl,
      ...extra,              // pos + carriedBy etc
      createdAt: serverTs(),
      updatedAt: serverTs(),
    };
  }

  function posOutside(x, y) {
    return { x, y, z: 0, layer: 0 };
  }

  function posFromCellId(cellId) {
    const parsed = parseCellId(cellId);
    if (!parsed) throw new Error('spawnItemAtCell: invalid_cellId');
    return { x: parsed.x, y: parsed.y, z: parsed.z, layer: parsed.layer };
  }

  async function spawnZombies(gameId, spawns) {
    if (!gameId) throw new Error('spawnZombies: missing gameId');

    const col = zombiesCol(gameId);
    if (!Array.isArray(spawns) || spawns.length === 0) return { ok: true, count: 0 };

    const existing = await col.get();
    if (!existing.empty) {
      const delBatch = db.batch();
      existing.forEach((doc) => delBatch.delete(doc.ref));
      await delBatch.commit();
    }

    const batch = db.batch();
    let count = 0;

    spawns.forEach((spawn) => {
      const x = Number(spawn.x);
      const y = Number(spawn.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const kindKey = String(spawn.kind || 'WALKER').trim().toUpperCase();
      const tmpl = resolveEntityConfig('ZOMBIE', kindKey);
      if (!tmpl) return;

      const doc = buildActorDocFromTemplate(tmpl, { pos: posOutside(x, y) });

      const ref = col.doc();
      batch.set(ref, doc);
      count += 1;
    });

    if (count > 0) await batch.commit();
    return { ok: true, count };
  }

  async function spawnHumans(gameId, spawns) {
    if (!gameId) throw new Error('spawnHumans: missing gameId');

    const col = humansCol(gameId);
    if (!Array.isArray(spawns) || spawns.length === 0) return { ok: true, count: 0 };

    const existing = await col.get();
    if (!existing.empty) {
      const delBatch = db.batch();
      existing.forEach((doc) => delBatch.delete(doc.ref));
      await delBatch.commit();
    }

    const batch = db.batch();
    let count = 0;

    spawns.forEach((spawn) => {
      const x = Number(spawn.x);
      const y = Number(spawn.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const kindKey = String(spawn.kind || 'CIVILIAN').trim().toUpperCase();
      const tmpl = resolveEntityConfig('HUMAN', kindKey);
      if (!tmpl) return;

      const doc = buildActorDocFromTemplate(tmpl, { pos: posOutside(x, y) });

      const ref = col.doc();
      batch.set(ref, doc);
      count += 1;
    });

    if (count > 0) await batch.commit();
    return { ok: true, count };
  }

  async function spawnItems(gameId, spawns) {
    if (!gameId) throw new Error('spawnItems: missing gameId');

    const col = itemsCol(gameId);
    if (!Array.isArray(spawns) || spawns.length === 0) return { ok: true, count: 0 };

    const existing = await col.get();
    if (!existing.empty) {
      const delBatch = db.batch();
      existing.forEach((doc) => delBatch.delete(doc.ref));
      await delBatch.commit();
    }

    const batch = db.batch();
    let count = 0;

    spawns.forEach((spawn) => {
      const x = Number(spawn.x);
      const y = Number(spawn.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const kindKey = String(spawn.kind || '').trim().toUpperCase();
      const tmpl = resolveEntityConfig('ITEM', kindKey);
      if (!tmpl) return;

      const doc = buildItemDocFromTemplate(tmpl, {
        pos: posOutside(x, y),
        carriedBy: null,     // spawn-only truth
      });

      const ref = col.doc();
      batch.set(ref, doc);
      count += 1;
    });

    if (count > 0) await batch.commit();
    return { ok: true, count };
  }

  async function spawnItemAtCell({ gameId, cellId, kind }) {
    if (!gameId) throw new Error('spawnItemAtCell: missing gameId');
    if (!cellId) throw new Error('spawnItemAtCell: missing cellId');
    if (!kind) throw new Error('spawnItemAtCell: missing kind');

    const pos = posFromCellId(cellId);
    const col = itemsCol(gameId);

    const kindKey = String(kind || '').trim().toUpperCase();
    const tmpl = resolveEntityConfig('ITEM', kindKey);
    if (!tmpl) throw new Error('spawnItemAtCell: invalid_kind');

    const doc = buildItemDocFromTemplate(tmpl, {
      pos,
      carriedBy: null,
    });

    const ref = col.doc();
    await ref.set(doc);

    return { ok: true, itemId: ref.id, kind: kindKey, pos };
  }

  return { spawnZombies, spawnHumans, spawnItems, spawnItemAtCell };
};
