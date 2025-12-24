// ld2030/v1/engine/state-writer-spawn.js
// Spawn helpers (zombies, humans, items).
//
// BIG BANG V1 COMPLIANCE:
// - Actors MUST have pos: { x, y, z, layer } where layer ∈ {0,1}
// - No legacy isInsideBuilding field (layer is the truth)
// - Spawned actors/items default to OUTSIDE: layer=0, z=0

const { resolveEntityConfig } = require('../entity');

module.exports = function makeSpawnStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-spawn: db is required');
  if (!admin) throw new Error('state-writer-spawn: admin is required');
  if (!state) throw new Error('state-writer-spawn: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  const { zombiesCol, humansCol, itemsCol } = state;

  function extractFactionFromTemplate(tmpl) {
    if (tmpl && typeof tmpl.faction === 'string' && tmpl.faction.trim()) {
      return tmpl.faction.trim();
    }
    const tags = Array.isArray(tmpl?.tags) ? tmpl.tags : [];
    for (const t of tags) {
      if (typeof t !== 'string') continue;
      if (t.startsWith('faction:')) {
        const f = t.slice('faction:'.length).trim();
        if (f) return f;
      }
    }
    if (String(tmpl?.type || '').toUpperCase() === 'ZOMBIE') return 'zombie';
    return 'neutral';
  }

  function buildActorDocFromTemplate(tmpl, extra) {
    const maxHp = Number.isFinite(tmpl.maxHp) ? tmpl.maxHp : 50;
    const maxAp = Number.isFinite(tmpl.maxAp) ? tmpl.maxAp : 2;
    const faction = extractFactionFromTemplate(tmpl);

    return {
      ...tmpl,
      faction,
      currentHp: maxHp,
      currentAp: maxAp,
      createdAt: serverTs(),
      updatedAt: serverTs(),
      ...extra,
    };
  }

  function buildItemDocFromTemplate(tmpl, extra) {
    const durabilityMax = Number.isFinite(tmpl.durabilityMax) ? tmpl.durabilityMax : 1;

    return {
      ...tmpl,
      currentDurability: durabilityMax,
      createdAt: serverTs(),
      updatedAt: serverTs(),
      ...extra,
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

      const doc = buildActorDocFromTemplate(tmpl, {
        pos: posOutside(x, y),
      });

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

      const doc = buildActorDocFromTemplate(tmpl, {
        pos: posOutside(x, y),
      });

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
        carriedBy: null,
      });

      const ref = col.doc();
      batch.set(ref, doc);
      count += 1;
    });

    if (count > 0) await batch.commit();
    return { ok: true, count };
  }

  return {
    spawnZombies,
    spawnHumans,
    spawnItems,
  };
};