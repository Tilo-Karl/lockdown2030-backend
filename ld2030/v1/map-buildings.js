// ld2030/v1/map-buildings.js
// Scan the grid for contiguous BUILD regions and generate simple building metadata.

const { MAP } = require('./game-config');

/**
 * Scan the grid for contiguous building regions and generate simple building metadata.
 *
 * We treat any connected cluster of BUILD tiles as a single building “footprint”
 * and assign:
 *   - a high-level building type from MAP.BUILDING_TYPES
 *   - a floor count with decreasing probability for higher floors
 *
 * @param {string[][]} rows   2D array of tile chars
 * @param {number} w          width
 * @param {number} h          height
 * @param {string} BUILD_CH   tile char that means "building" (TILES.BUILD)
 * @param {function():number} rnd  deterministic RNG (0..1)
 * @returns {Array<{id:string,type:string,root:{x:number,y:number},tiles:number,floors:number}>}
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

  // High-level building categories for metadata; fall back to a generic HOUSE
  const buildingTypes = (MAP && MAP.BUILDING_TYPES) || ['HOUSE'];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rows[y][x] !== BUILD_CH || visited[y][x]) continue;

      // Flood fill to get all tiles belonging to this building footprint
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

      // Deterministic "root" tile (top-most, then left-most)
      let root = tiles[0];
      for (const t of tiles) {
        if (t.y < root.y || (t.y === root.y && t.x < root.x)) {
          root = t;
        }
      }

      // Probabilistic floors: start at 1, then add floors with decreasing probability
      let floors = 1;

      // 40% chance to get floor 2
      if (rnd() < 0.40) {
        floors = 2;

        // 25% chance to get floor 3
        if (rnd() < 0.25) {
          floors = 3;

          // 10% chance to get floor 4
          if (rnd() < 0.10) {
            floors = 4;
          }
        }
      }

      // Deterministic high-level building type label (HOUSE / SHOP / POLICE / etc.)
      const typeIndex = Math.floor(rnd() * buildingTypes.length);
      const type = buildingTypes[typeIndex] || 'HOUSE';

      buildings.push({
        id: `b${buildings.length}`,
        type,
        root,
        tiles: tiles.length,
        floors,
      });
    }
  }

  return buildings;
}

module.exports = {
  extractBuildings,
};