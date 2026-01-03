// ld2030/v1/engine/state-writer-spawn.js

const { resolveEntityConfig } = require('../entity');

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

  return { spawnZombies, spawnHumans, spawnItems };
};