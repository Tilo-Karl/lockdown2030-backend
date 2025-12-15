// ld2030/v1/state-spawn.js — spawn zombies, humans and items for a new game

const { ZOMBIE } = require('./config/config-game');

async function spawnAllForNewGame({ gameId, mapMeta, spawnWriter }) {
  if (!mapMeta || !Array.isArray(mapMeta.terrain) || mapMeta.terrain.length === 0) return;

  const rows = mapMeta.terrain;
  const height = rows.length;
  const width = rows[0]?.length || 0;
  if (width <= 0 || height <= 0) return;

  // This comes from your game doc: games/{gameId}.mapMeta.tileMeta
  // (written by state.js from config-tile)
  const tileMeta = mapMeta.tileMeta || {};

  function canSpawnZombieOn(ch) {
    const m = tileMeta[ch];
    if (!m) return false;
    return m.zombieSpawnAllowed !== false;
  }

  function canSpawnHumanOn(ch) {
    const m = tileMeta[ch];
    if (!m) return false;
    return m.playerSpawnAllowed !== false;
  }

  function canSpawnItemOn(ch) {
    const m = tileMeta[ch];
    if (!m) return false;
    // Items follow the same “don’t spawn where players shouldn’t spawn” rule
    return m.playerSpawnAllowed !== false;
  }

  const totalTiles = width * height;

  // ---------------------------------------------------------------------------
  // Zombies
  // ---------------------------------------------------------------------------
  const density = typeof ZOMBIE?.DENSITY === 'number' ? ZOMBIE.DENSITY : 0.04;
  let desiredZombies = Math.floor(totalTiles * density);

  if (typeof ZOMBIE?.MIN === 'number') desiredZombies = Math.max(desiredZombies, ZOMBIE.MIN);
  if (typeof ZOMBIE?.MAX === 'number') desiredZombies = Math.min(desiredZombies, ZOMBIE.MAX);
  if (!Number.isFinite(desiredZombies) || desiredZombies < 1) desiredZombies = 1;

  const zombieSpawns = [];
  let safetyZ = 0;
  let spawnedZ = 0;
  const maxTriesZ = desiredZombies * 30;

  function pickZombieKind() {
    const r = Math.random();
    if (r < 0.65) return 'WALKER';
    if (r < 0.85) return 'RUNNER';
    if (r < 0.97) return 'SMART';
    return 'HULK';
  }

  while (spawnedZ < desiredZombies && safetyZ < maxTriesZ) {
    safetyZ += 1;

    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const row = rows[y];
    if (!row) continue;

    const ch = row.charAt(x);

    // Spawn rule: respect tileMeta (NOT movement blocking; just spawn allowed)
    if (!canSpawnZombieOn(ch)) continue;

    zombieSpawns.push({ x, y, kind: pickZombieKind() });
    spawnedZ += 1;
  }

  if (zombieSpawns.length > 0) {
    await spawnWriter.spawnZombies(gameId, zombieSpawns);
  }

  // ---------------------------------------------------------------------------
  // Humans
  // ---------------------------------------------------------------------------
  const HUMAN_DENSITY = 0.01;
  const HUMAN_MIN = 3;
  const HUMAN_MAX = 40;

  let desiredHumans = Math.floor(totalTiles * HUMAN_DENSITY);
  desiredHumans = Math.max(HUMAN_MIN, Math.min(HUMAN_MAX, desiredHumans));

  const humanSpawns = [];
  let safetyH = 0;
  let spawnedH = 0;
  const maxTriesH = desiredHumans * 30;

  function pickHumanKind() {
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

    // Spawn rule: respect tileMeta spawn rules
    if (!canSpawnHumanOn(ch)) continue;

    humanSpawns.push({ x, y, kind: pickHumanKind() });
    spawnedH += 1;
  }

  if (humanSpawns.length > 0) {
    await spawnWriter.spawnHumans(gameId, humanSpawns);
  }

  // ---------------------------------------------------------------------------
  // Items
  // ---------------------------------------------------------------------------
  const ITEM_DENSITY = 0.015;
  const ITEM_MIN = 5;
  const ITEM_MAX = 60;

  let desiredItems = Math.floor(totalTiles * ITEM_DENSITY);
  desiredItems = Math.max(ITEM_MIN, Math.min(ITEM_MAX, desiredItems));

  const itemSpawns = [];
  let safetyI = 0;
  let spawnedI = 0;
  const maxTriesI = desiredItems * 30;

  const ITEM_KIND_POOL = [
    'MEDKIT',
    'MRE',
    'TOOLKIT',
    'LOCKPICK',
    'GENERATOR_PORTABLE',
    'KNIFE',
    'BASEBALL_BAT',
    'PIPE',
    'PISTOL',
    'CROSSBOW',
    'HOODIE',
    'RIOT_VEST',
    'HELMET',
    'WORK_GLOVES',
    'BOOTS',
  ];

  function pickItemKind() {
    return ITEM_KIND_POOL[Math.floor(Math.random() * ITEM_KIND_POOL.length)];
  }

  while (spawnedI < desiredItems && safetyI < maxTriesI) {
    safetyI += 1;

    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const row = rows[y];
    if (!row) continue;

    const ch = row.charAt(x);

    // Spawn rule: respect tileMeta spawn rules
    if (!canSpawnItemOn(ch)) continue;

    itemSpawns.push({ x, y, kind: pickItemKind() });
    spawnedI += 1;
  }

  if (itemSpawns.length > 0) {
    await spawnWriter.spawnItems(gameId, itemSpawns);
  }
}

module.exports = { spawnAllForNewGame };