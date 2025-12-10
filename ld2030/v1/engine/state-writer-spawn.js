// ld2030/v1/engine/state-writer-spawn.js
// Spawners for zombies, human NPCs and items.

const { resolveEntityConfig } = require('../entity');

module.exports = function makeSpawnStateWriter({ db, admin, state }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  /**
   * Respawn zombies for a game based on a list of spawn specs.
   * Clears old zombies, then creates fresh ones based on ZOMBIES templates via entity config.
   */
  async function spawnZombies(gameId, spawns) {
    if (!gameId) {
      throw new Error('spawnZombies: missing gameId');
    }

    const zombiesCol = state.zombiesCol(gameId);

    // Clear existing zombies for this game (fresh round)
    const existing = await zombiesCol.get();
    if (!existing.empty) {
      const delBatch = db.batch();
      existing.forEach((doc) => delBatch.delete(doc.ref));
      await delBatch.commit();
    }

    if (!Array.isArray(spawns) || spawns.length === 0) {
      return { ok: true, count: 0 };
    }

    const batch = db.batch();

    spawns.forEach((spawn) => {
      const x = Number(spawn.x);
      const y = Number(spawn.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      const kindKey = (spawn.kind || 'WALKER').toUpperCase();
      const tmpl = resolveEntityConfig('ZOMBIE', kindKey) || {};

      const ref = zombiesCol.doc();
      batch.set(ref, {
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
    });

    await batch.commit();
    return { ok: true, count: spawns.length };
  }

  /**
   * Spawn human NPCs based on a list of spawn specs.
   * Each spawn: { x, y, kind? }
   */
  async function spawnHumanNpcs(gameId, spawns) {
    if (!gameId) {
      throw new Error('spawnHumanNpcs: missing gameId');
    }

    const npcsCol = state.npcsCol(gameId);

    if (!Array.isArray(spawns) || spawns.length === 0) {
      return { ok: true, count: 0 };
    }

    const batch = db.batch();

    spawns.forEach((spawn) => {
      const x = Number(spawn.x);
      const y = Number(spawn.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      const kindKey = (spawn.kind || 'CIVILIAN').toUpperCase();
      const tmpl = resolveEntityConfig('HUMAN', kindKey) || {};

      const ref = npcsCol.doc();
      batch.set(ref, {
        type: tmpl.type || 'HUMAN_NPC',
        kind: tmpl.kind || 'CIVILIAN',
        hp: tmpl.baseHp ?? tmpl.maxHp ?? 50,
        maxHp: tmpl.maxHp ?? tmpl.baseHp ?? 50,
        alive: true,
        pos: { x, y },
        spawnedAt: serverTs(),
      });
    });

    await batch.commit();
    return { ok: true, count: spawns.length };
  }

  /**
   * Spawn items based on a list of spawn specs.
   * Each spawn: { x, y, kind? }
   */
  async function spawnItems(gameId, spawns) {
    if (!gameId) {
      throw new Error('spawnItems: missing gameId');
    }

    const itemsCol = state.itemsCol(gameId);

    if (!Array.isArray(spawns) || spawns.length === 0) {
      return { ok: true, count: 0 };
    }

    const batch = db.batch();

    spawns.forEach((spawn) => {
      const x = Number(spawn.x);
      const y = Number(spawn.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      const kindKey = (spawn.kind || 'GENERIC').toUpperCase();
      const tmpl = resolveEntityConfig('ITEM', kindKey) || {};

      const ref = itemsCol.doc();
      batch.set(ref, {
        type: tmpl.type || 'ITEM',
        kind: tmpl.kind || 'GENERIC',
        hp: tmpl.baseHp ?? null,
        maxHp: tmpl.maxHp ?? null,
        pos: { x, y },
        spawnedAt: serverTs(),
      });
    });

    await batch.commit();
    return { ok: true, count: spawns.length };
  }

  return {
    spawnZombies,
    spawnHumanNpcs,
    spawnItems,
  };
};