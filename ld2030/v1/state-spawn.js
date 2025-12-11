// ld2030/v1/state-spawn.js — spawn zombies, human NPCs and items for a new game

const { TILES } = require('./config');
const { ZOMBIE } = require('./config/config-game');

/**
 * Spawn zombies, human NPCs and items using the spawn writer.
 * Expects the same mapMeta that writeMapAndGame wrote to the game doc.
 *
 * @param {object} params
 * @param {string} params.gameId
 * @param {object} params.mapMeta
 * @param {object} params.spawnWriter - from makeSpawnStateWriter(...)
 */
async function spawnAllForNewGame({ gameId, mapMeta, spawnWriter }) {
  // --- Guard: nothing to spawn without terrain ---
  if (!mapMeta || !Array.isArray(mapMeta.terrain) || mapMeta.terrain.length === 0) {
    return; // nothing else we can do
  }

  const rows = mapMeta.terrain;
  const height = rows.length;
  const width = rows[0]?.length || 0;
  if (width <= 0 || height <= 0) return;

  const totalTiles = width * height;

  // ---------------------------------------------------------------------------
  // Zombies (same density as before)
  // ---------------------------------------------------------------------------
  const density = typeof ZOMBIE?.DENSITY === 'number' ? ZOMBIE.DENSITY : 0.04;
  let desiredZombies = Math.floor(totalTiles * density);

  if (typeof ZOMBIE?.MIN === 'number') {
    desiredZombies = Math.max(desiredZombies, ZOMBIE.MIN);
  }
  if (typeof ZOMBIE?.MAX === 'number') {
    desiredZombies = Math.min(desiredZombies, ZOMBIE.MAX);
  }
  if (!Number.isFinite(desiredZombies) || desiredZombies < 1) {
    desiredZombies = 1;
  }

  const zombieSpawns = [];
  let safetyZ = 0;
  let spawnedZ = 0;
  const maxTriesZ = desiredZombies * 30;

  while (spawnedZ < desiredZombies && safetyZ < maxTriesZ) {
    safetyZ += 1;

    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const row = rows[y];
    if (!row) continue;

    const ch = row.charAt(x);
    // Terrain codes from config (TILES):
    // ROAD, BUILD, CEMETERY, PARK, FOREST, WATER
    if (ch === TILES.WATER) {
      // No swimming zombies.
      continue;
    }

    zombieSpawns.push({ x, y, kind: 'WALKER' });
    spawnedZ += 1;
  }

  if (zombieSpawns.length > 0) {
    await spawnWriter.spawnZombies(gameId, zombieSpawns);
  }

  // ---------------------------------------------------------------------------
  // Human NPCs — CIVILIAN / RAIDER / TRADER mix
  // ---------------------------------------------------------------------------
  const HUMAN_DENSITY = 0.01; // ~1% of tiles
  const HUMAN_MIN = 3;
  const HUMAN_MAX = 40;

  let desiredHumans = Math.floor(totalTiles * HUMAN_DENSITY);
  desiredHumans = Math.max(HUMAN_MIN, Math.min(HUMAN_MAX, desiredHumans));

  const humanSpawns = [];
  let safetyH = 0;
  let spawnedH = 0;
  const maxTriesH = desiredHumans * 30;

  function pickHumanKind() {
    // 70% CIVILIAN, 20% RAIDER, 10% TRADER (tweak later)
    const r = Math.random();
    if (r < 0.70) return 'CIVILIAN';
    if (r < 0.90) return 'RAIDER';
    return 'TRADER';
  }

  while (spawnedH < desiredHumans && safetyH < maxTriesH) {
    safetyH += 1;

    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const row = rows[y];
    if (!row) continue;

    const ch = row.charAt(x);
    if (ch === TILES.WATER) continue;

    humanSpawns.push({ x, y, kind: pickHumanKind() });
    spawnedH += 1;
  }

  if (humanSpawns.length > 0) {
    await spawnWriter.spawnHumanNpcs(gameId, humanSpawns);
  }

  // ---------------------------------------------------------------------------
  // Items — simple mix of POLICE / SHOP kinds (no building logic yet)
  // ---------------------------------------------------------------------------
  const ITEM_DENSITY = 0.015; // ~1.5% of tiles
  const ITEM_MIN = 5;
  const ITEM_MAX = 60;

  let desiredItems = Math.floor(totalTiles * ITEM_DENSITY);
  desiredItems = Math.max(ITEM_MIN, Math.min(ITEM_MAX, desiredItems));

  const itemSpawns = [];
  let safetyI = 0;
  let spawnedI = 0;
  const maxTriesI = desiredItems * 30;

  // These kinds must match what resolveEntityConfig('ITEM', kind) understands.
  const ITEM_KIND_POOL = [
    'POLICE_WEAPON', // e.g. pistol / shotgun
    'POLICE_ARMOR',  // e.g. vest / helmet
    'SHOP_WEAPON',   // e.g. baton / knife
    'SHOP_MISC',     // e.g. water, batteries, etc.
  ];

  function pickItemKind() {
    const idx = Math.floor(Math.random() * ITEM_KIND_POOL.length);
    return ITEM_KIND_POOL[idx];
  }

  while (spawnedI < desiredItems && safetyI < maxTriesI) {
    safetyI += 1;

    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const row = rows[y];
    if (!row) continue;

    const ch = row.charAt(x);
    if (ch === TILES.WATER) continue;

    itemSpawns.push({ x, y, kind: pickItemKind() });
    spawnedI += 1;
  }

  if (itemSpawns.length > 0) {
    await spawnWriter.spawnItems(gameId, itemSpawns);
  }
}
// write zombies and players!
module.exports = {
  spawnAllForNewGame,
};