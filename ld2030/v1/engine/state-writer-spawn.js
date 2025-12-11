// ld2030/v1/engine/state-writer-spawn.js
// All spawn helpers (zombies, human NPCs, items) in one place.
// NOW: every spawned entity gets full combat stats on the doc.

const { resolveEntityConfig } = require('../entity');

module.exports = function makeSpawnStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-spawn: db is required');
  if (!admin) throw new Error('state-writer-spawn: admin is required');
  if (!state) throw new Error('state-writer-spawn: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  const { zombiesCol, npcsCol, itemsCol } = state;

  // Helpers to normalize config → final stats on doc -------------------------

  function buildActorDocFromConfig(tmpl, extra) {
    const baseHp         = Number.isFinite(tmpl.baseHp) ? tmpl.baseHp : 60;
    const baseAp         = Number.isFinite(tmpl.baseAp) ? tmpl.baseAp : 0;
    const attackDamage   =
      Number.isFinite(tmpl.baseAttackDamage) ? tmpl.baseAttackDamage :
      Number.isFinite(tmpl.attackDamage)     ? tmpl.attackDamage     : 5;
    const attackApCost   =
      Number.isFinite(tmpl.attackApCost) ? tmpl.attackApCost : 1;
    const hitChance      =
      Number.isFinite(tmpl.baseHitChance) ? tmpl.baseHitChance :
      Number.isFinite(tmpl.hitChance)     ? tmpl.hitChance     : 1.0;
    const armor          =
      Number.isFinite(tmpl.baseArmor) ? tmpl.baseArmor :
      Number.isFinite(tmpl.armor)     ? tmpl.armor     : 0;

    return {
      type:    tmpl.type    || 'UNKNOWN',
      kind:    tmpl.kind    || 'DEFAULT',
      species: tmpl.species || 'unknown',
      tags:    Array.isArray(tmpl.tags) ? tmpl.tags : [],
      hp:      baseHp,
      maxHp:   baseHp,
      ap:      baseAp,
      attackDamage,
      attackApCost,
      hitChance,
      armor,
      alive:   true,
      ...extra,
      // keep original config hooks if needed later
      baseHp,
      baseAp,
      baseAttackDamage: attackDamage,
      baseAttackApCost: attackApCost,
      baseArmor: armor,
      spawnedAt: serverTs(),
      updatedAt: serverTs(),
    };
  }

  function buildItemDocFromConfig(tmpl, extra) {
    const baseHp   = Number.isFinite(tmpl.baseHp) ? tmpl.baseHp : null;
    const armor    = Number.isFinite(tmpl.armor) ? tmpl.armor : 0;
    const damage   = Number.isFinite(tmpl.damage) ? tmpl.damage : 0;
    const weight   = Number.isFinite(tmpl.weight) ? tmpl.weight : 1;
    const value    = Number.isFinite(tmpl.value) ? tmpl.value : 0;
    const durable  = Number.isFinite(tmpl.durability) ? tmpl.durability : null;

    return {
      type:    tmpl.type    || 'ITEM',
      kind:    tmpl.kind    || 'GENERIC',
      species: tmpl.species || 'object',
      tags:    Array.isArray(tmpl.tags) ? tmpl.tags : [],
      hp:      baseHp,
      maxHp:   baseHp,
      armor,
      damage,
      weight,
      value,
      durability: durable,
      slot: tmpl.slot || null, // weapon/body/etc.
      alive: baseHp == null ? null : baseHp > 0,
      ...extra,
      spawnedAt: serverTs(),
      updatedAt: serverTs(),
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

      const kindKey = (spawn.kind || 'WALKER').toUpperCase();
      const tmpl = resolveEntityConfig('ZOMBIE', kindKey) || {};

      const doc = buildActorDocFromConfig(tmpl, {
        pos: { x, y },
      });

      const ref = col.doc();
      batch.set(ref, doc);
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

      const doc = buildActorDocFromConfig(tmpl, {
        pos: { x, y },
        faction: tmpl.faction || 'neutral',
      });

      const ref = col.doc();
      batch.set(ref, doc);
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

      const doc = buildItemDocFromConfig(tmpl, {
        pos: { x, y },
      });

      const ref = col.doc();
      batch.set(ref, doc);
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