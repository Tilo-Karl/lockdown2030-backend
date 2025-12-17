// ld2030/v1/actions/index.js
// One place to register all action endpoints (move/attack/equip/search/enter/stairs).

const registerMovePlayer = require('./move-player');
const registerAttackEntity = require('./attack-entity');
const registerEquipItem = require('./equip-item');
const registerUnequipItem = require('./unequip-item');
const registerSearch = require('./search');
const registerEnterBuilding = require('./enter-building');
const registerStairs = require('./stairs');

module.exports = function registerActions(app, { engine, base }) {
  if (!app) throw new Error('registerActions: app is required');
  if (!engine) throw new Error('registerActions: engine is required');
  if (!base) throw new Error('registerActions: base is required');

  registerMovePlayer(app, { engine, base });
  registerAttackEntity(app, { engine, base });

  registerEquipItem(app, { engine, base });
  registerUnequipItem(app, { engine, base });

  registerSearch(app, { engine, base });

  registerEnterBuilding(app, { engine, base });
  registerStairs(app, { engine, base });
};