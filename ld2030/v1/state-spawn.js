// ld2030/v1/state-spawn.js
// Spawn zombies, humans and items for a new game.

const { ZOMBIE } = require('./config/config-game');
const { TILE_META } = require('./config/config-tile');

function tileMetaFor(cell) {
  const code = cell?.terrain;
  return code != null ? TILE_META[String(code)] || null : null;
}

function canSpawnZombieOn(cell) {
  const meta = tileMetaFor(cell);
  if (!meta) return false;
  return meta.zombieSpawnAllowed !== false;
}

function canSpawnHumanOn(cell) {
  const meta = tileMetaFor(cell);
  if (!meta) return false;
  return meta.playerSpawnAllowed !== false;
}

const canSpawnItemOn = canSpawnHumanOn;

function isInLabRadius(cell, lab, radius) {
  if (!lab || !Number.isFinite(lab.x) || !Number.isFinite(lab.y)) return false;
  if (!Number.isFinite(radius) || radius <= 0) return false;
  const dx = cell.x - lab.x;
  const dy = cell.y - lab.y;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const idx = Math.floor(Math.random() * list.length);
  return list[idx] || null;
}

async function loadOutsideCells(state, gameId) {
  if (!state || typeof state.cellsCol !== 'function') return [];
  const col = state.cellsCol(gameId);
  const snap = await col.where('layer', '==', 0).get();
  const out = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const x = Number(data.x);
    const y = Number(data.y);
    const z = Number(data.z ?? 0);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (z !== 0) return;
    if (data.blocksMove === true) return;
    out.push({
      x,
      y,
      terrain: data.terrain ?? null,
    });
  });
  return out;
}

async function spawnAllForNewGame({
  gameId,
  state,
  spawnWriter,
  lab = null,
  safeRadiusFromLab = 0,
}) {
  if (!gameId) throw new Error('spawnAllForNewGame: missing_gameId');
  if (!state || typeof state.cellsCol !== 'function') throw new Error('spawnAllForNewGame: state_missing_cellsCol');
  if (!spawnWriter) throw new Error('spawnAllForNewGame: spawnWriter_required');

  const outsideCells = await loadOutsideCells(state, gameId);
  if (!outsideCells.length) return;

  const safeRadius = Number.isFinite(safeRadiusFromLab) ? Math.max(0, Number(safeRadiusFromLab)) : 0;

  const zombieCandidates = outsideCells.filter((cell) => canSpawnZombieOn(cell));
  const humanCandidates = outsideCells.filter(
    (cell) => canSpawnHumanOn(cell) && !isInLabRadius(cell, lab, safeRadius)
  );
  const itemCandidates = outsideCells.filter(
    (cell) => canSpawnItemOn(cell) && !isInLabRadius(cell, lab, safeRadius)
  );

  const totalTiles = outsideCells.length;

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
    const cell = pickRandom(zombieCandidates);
    if (!cell) break;
    zombieSpawns.push({ x: cell.x, y: cell.y, kind: pickZombieKind() });
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
    const cell = pickRandom(humanCandidates);
    if (!cell) break;
    humanSpawns.push({ x: cell.x, y: cell.y, kind: pickHumanKind() });
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
    'BACKPACK',
    'SHOPPING_CART',
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
    const cell = pickRandom(itemCandidates);
    if (!cell) break;
    itemSpawns.push({ x: cell.x, y: cell.y, kind: pickItemKind() });
    spawnedI += 1;
  }

  if (itemSpawns.length > 0) {
    await spawnWriter.spawnItems(gameId, itemSpawns);
  }
}

module.exports = { spawnAllForNewGame };
