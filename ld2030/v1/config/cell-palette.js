// ld2030/v1/config/cell-palette.js
// Single source for runtime rendering palette (terrain/building/edge colors).

const { TILE_META } = require('./config-tile');
const { MAP } = require('./config-game');

const CELL_PALETTE_VERSION = 1;

function buildTerrainColors() {
  const terrainColors = {};
  Object.entries(TILE_META || {}).forEach(([code, meta]) => {
    if (meta && meta.colorHex) {
      terrainColors[String(code)] = meta.colorHex;
    }
  });
  return terrainColors;
}

function buildBuildingColors() {
  const buildingColors = {};
  const palette = (MAP && MAP.BUILDING_PALETTE) || {};
  Object.entries(palette).forEach(([type, hex]) => {
    if (hex) buildingColors[String(type)] = hex;
  });
  return buildingColors;
}

function buildCellPalette() {
  return {
    version: CELL_PALETTE_VERSION,
    terrainColors: buildTerrainColors(),
    buildingColors: buildBuildingColors(),
    edgeColors: {
      doorClosed: '#5E6B7E',
      doorOpen: '#4FA06D',
      doorDestroyed: '#B95050',
      stairsOpen: '#6F8BF2',
      stairsBarricaded: '#B77930',
    },
  };
}

module.exports = {
  CELL_PALETTE_VERSION,
  buildCellPalette,
};
