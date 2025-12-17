// ld2030/v1/map-buildings.js
// Scan the grid for contiguous BUILD regions and generate simple building metadata.

const { MAP } = require('./config');

function normalizeBuildingType(type, floors) {
  const t = String(type || '').toUpperCase();
  const f = Number.isFinite(floors) ? floors : 1;

  // HOUSE -> APARTMENT if tall
  if (t === 'HOUSE' && f >= 3) return 'APARTMENT';

  // PHARMACY -> CLINIC/HOSPITAL by floors
  if (t === 'PHARMACY') {
    if (f >= 3) return 'HOSPITAL';
    if (f >= 2) return 'CLINIC';
    return 'PHARMACY';
  }

  // MOTEL -> HOTEL if tall
  if (t === 'MOTEL' && f >= 3) return 'HOTEL';

  // SCHOOL -> UNIVERSITY if tall
  if (t === 'SCHOOL' && f >= 3) return 'UNIVERSITY';

  return t || 'HOUSE';
}

/**
 * Scan the grid for contiguous building regions and generate simple building metadata.
 *
 * @param {string[][]} rows
 * @param {number} w
 * @param {number} h
 * @param {string} BUILD_CH
 * @param {function():number} rnd  deterministic RNG (0..1)
 */
function extractBuildings(rows, w, h, BUILD_CH, rnd) {
  const visited = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => false)
  );
  const buildings = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const buildingTypes = (MAP && MAP.BUILDING_TYPES) || ['HOUSE'];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== BUILD_CH || visited[y][x]) continue;

      const queue = [{ x, y }];
      visited[y][x] = true;
      const tiles = [];

      while (queue.length > 0) {
        const { x: cx, y: cy } = queue.shift();
        tiles.push({ x: cx, y: cy });

        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (visited[ny][nx]) continue;
          if (rows[ny][nx] !== BUILD_CH) continue;
          visited[ny][nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }

      if (tiles.length === 0) continue;

      // root = top-most, then left-most
      let root = tiles[0];
      for (const t of tiles) {
        if (t.y < root.y || (t.y === root.y && t.x < root.x)) {
          root = t;
        }
      }

      // floors: 1..4 (decreasing probability)
      let floors = 1;
      if (rnd() < 0.40) {
        floors = 2;
        if (rnd() < 0.25) {
          floors = 3;
          if (rnd() < 0.10) floors = 4;
        }
      }

      const typeIndex = Math.floor(rnd() * buildingTypes.length);
      const baseType = buildingTypes[typeIndex] || 'HOUSE';
      const type = normalizeBuildingType(baseType, floors);

      buildings.push({
        id: `b${buildings.length}`,   // <- this IS your buildingId
        type,
        root,

        // Full footprint for movement/search rules
        tiles,                        // [{x,y}, ...]

        // Optional convenience
        tileCount: tiles.length,

        floors,
      });
    }
  }

  return buildings;
}

module.exports = {
  extractBuildings,
  normalizeBuildingType,
};