// ld2030/v1/engine/state-writer-spawn.js
// Spawn helpers (zombies, human actors, items).
// NEW MODEL (no legacy):
// - Actors use: maxHp/maxAp + currentHp/currentAp
// - Items use: durabilityMax + currentDurability
// - Templates are the single source of truth for defaults.
// - Spawner adds runtime/world fields: pos, createdAt, updatedAt, current* values.
//
// Improvement:
// - Stamp faction explicitly on spawned ACTORS (derived from tmpl.faction or tags 'faction:*').

const { resolveEntityConfig } = require('../entity');

module.exports = function makeSpawnStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-spawn: db is required');
  if (!admin) throw new Error('state-writer-spawn: admin is required');
  if (!state) throw new Error('state-writer-spawn: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  const { zombiesCol, npcsCol, itemsCol } = state;

  // ---------------------------------------------------------------------------
  // Helpers: template -> Firestore doc (runtime fields injected here)
  // ---------------------------------------------------------------------------

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
    // Sensible defaults if not provided
    if (String(tmpl?.type || '').toUpperCase() === 'ZOMBIE') return 'zombie';
    return 'neutral';
  }

  function buildActorDocFromTemplate(tmpl, extra) {
    const maxHp = Number.isFinite(tmpl.maxHp) ? tmpl.maxHp : 50;
    const maxAp = Number.isFinite(tmpl.maxAp) ? tmpl.maxAp : 2;

    // Explicit faction stamp (single canonical field on the doc)
    const faction = extractFactionFromTemplate(tmpl);

    return {
      // template defaults (includes BASE_ACTOR shape)
      ...tmpl,

      // canonical relations field
      faction,

      // runtime/current values (authoritative on the doc)
      currentHp: maxHp,
      currentAp: maxAp,

      // timestamps
      createdAt: serverTs(),
      updatedAt: serverTs(),

      // world fields
      ...extra,
    };
  }

  function buildItemDocFromTemplate(tmpl, extra) {
    const durabilityMax = Number.isFinite(tmpl.durabilityMax) ? tmpl.durabilityMax : 1;

    return {
      // template defaults (includes BASE_ITEM shape)
      ...tmpl,

      // runtime/current values
      currentDurability: durabilityMax,

      // timestamps
      createdAt: serverTs(),
      updatedAt: serverTs(),

      // world fields
      ...extra,
    };
  }

  // ---------------------------------------------------------------------------
  // ZOMBIES
  // spawns: [{ x, y, kind }]
  // ---------------------------------------------------------------------------
  async function spawnZombies(gameId, spawns) {
    if (!gameId) throw new Error('spawnZombies: missing gameId');

    const col = zombiesCol(gameId);
    if (!Array.isArray(spawns) || spawns.length === 0) {
      return { ok: true, count: 0 };
    }

    // Clear existing zombies for this game (fresh round)
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
      if (!tmpl) return; // no fallbacks

      const doc = buildActorDocFromTemplate(tmpl, {
        pos: { x, y },
      });

      const ref = col.doc();
      batch.set(ref, doc);
      count += 1;
    });

    if (count > 0) await batch.commit();
    return { ok: true, count };
  }

  // ---------------------------------------------------------------------------
  // HUMANS (non-player actors)
  // spawns: [{ x, y, kind }]
  // NOTE: stored in npcs collection, but type on doc is HUMAN.
  // ---------------------------------------------------------------------------
  async function spawnHumans(gameId, spawns) {
    if (!gameId) throw new Error('spawnHumans: missing gameId');

    const col = npcsCol(gameId);
    if (!Array.isArray(spawns) || spawns.length === 0) {
      return { ok: true, count: 0 };
    }

    // Clear existing humans for this game (fresh round)
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
        pos: { x, y },
      });

      const ref = col.doc();
      batch.set(ref, doc);
      count += 1;
    });

    if (count > 0) await batch.commit();
    return { ok: true, count };
  }

  // ---------------------------------------------------------------------------
  // ITEMS
  // spawns: [{ x, y, kind }]
  // ---------------------------------------------------------------------------
  async function spawnItems(gameId, spawns) {
    if (!gameId) throw new Error('spawnItems: missing gameId');

    const col = itemsCol(gameId);
    if (!Array.isArray(spawns) || spawns.length === 0) {
      return { ok: true, count: 0 };
    }

    // Clear existing items for this game (fresh round)
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
        pos: { x, y },
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
    // keep the old name for the call site, but it’s HUMAN docs
    spawnHumanNpcs: spawnHumans,
    spawnItems,
  };
};