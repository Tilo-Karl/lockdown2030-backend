// ld2030/v1/engine/state-writer-spawn.js
// All spawn helpers (zombies, human NPCs, items) in one place.

const { resolveEntityConfig } = require('../entity');

module.exports = function makeSpawnStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-spawn: db is required');
  if (!admin) throw new Error('state-writer-spawn: admin is required');
  if (!state) throw new Error('state-writer-spawn: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  const { zombiesCol, npcsCol, itemsCol } = state;

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

      const kindKey = (spawn.kind || 'WALKER').toUpperCase();
      const tmpl = resolveEntityConfig('ZOMBIE', kindKey) || {};

      const ref = col.doc();
      batch.set(ref, {
        id: ref.id,
        type: tmpl.type || 'ZOMBIE',
        kind: tmpl.kind || 'walker',
        hp: tmpl.baseHp ?? 60,
        maxHp: tmpl.baseHp ?? 60,
        alive: true,
        pos: { x, y },
        attackDamage: tmpl.attackDamage ?? 5,
        hitChance: tmpl.hitChance ?? 1.0,
        spawnedAt: serverTs(),
      });

      count += 1;
    });

    if (count > 0) {
      await batch.commit();
    }

    return { ok: true, count };
  }

  // ---------------------------------------------------------------------------
  // HUMAN NPCs
  // spawns: [{ x, y, kind }]
  // ---------------------------------------------------------------------------
  async function spawnHumanNpcs(gameId, spawns) {
    if (!gameId) throw new Error('spawnHumanNpcs: missing gameId');

    const col = npcsCol(gameId);
    if (!Array.isArray(spawns) || spawns.length === 0) {
      return { ok: true, count: 0 };
    }

    // Clear existing NPCs for this game (fresh round)
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

      const kindKey = (spawn.kind || 'CIVILIAN').toUpperCase();
      const tmpl = resolveEntityConfig('HUMAN', kindKey) || {};

      const ref = col.doc();
      batch.set(ref, {
        id: ref.id,
        type: tmpl.type || 'HUMAN_NPC',
        kind: tmpl.kind || 'CIVILIAN',
        hp: tmpl.baseHp ?? 80,
        maxHp: tmpl.baseHp ?? 80,
        alive: true,
        pos: { x, y },
        faction: tmpl.faction || 'neutral',
        spawnedAt: serverTs(),
      });

      count += 1;
    });

    if (count > 0) {
      await batch.commit();
    }

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

      const kindKey = (spawn.kind || 'GENERIC').toUpperCase();
      const tmpl = resolveEntityConfig('ITEM', kindKey) || {};

      const ref = col.doc();
      batch.set(ref, {
        id: ref.id,
        type: tmpl.type || 'ITEM',
        kind: tmpl.kind || 'GENERIC',
        hp: tmpl.baseHp ?? null,    // items can be destructible later
        maxHp: tmpl.baseHp ?? null,
        pos: { x, y },
        weight: tmpl.weight ?? 1,
        armor: tmpl.armor ?? 0,
        damage: tmpl.damage ?? 0,
        spawnedAt: serverTs(),
      });

      count += 1;
    });

    if (count > 0) {
      await batch.commit();
    }

    return { ok: true, count };
  }

  return {
    spawnZombies,
    spawnHumanNpcs,
    spawnItems,
  };
};