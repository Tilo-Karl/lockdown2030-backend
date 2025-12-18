// One place to register all action endpoints (move/attack/equip/search/enter/stairs/climb/doors/stairs-barricades).

const registerMovePlayer    = require('./move-player');
const registerAttackEntity  = require('./attack-entity');
const registerEquipItem     = require('./equip-item');
const registerUnequipItem   = require('./unequip-item');
const registerSearch        = require('./search');

const registerEnterBuilding = require('./enter-building');
const registerStairs        = require('./stairs');
const registerClimbIn       = require('./climb-in');
const registerClimbOut      = require('./climb-out');

const registerSecureDoor       = require('./secure-door');
const registerBarricadeDoor    = require('./barricade-door');
const registerDebarricadeDoor  = require('./debarricade-door');
const registerRepairDoor       = require('./repair-door');

const registerBarricadeStairs   = require('./barricade-stairs');
const registerDebarricadeStairs = require('./debarricade-stairs');

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

  registerClimbIn(app, { engine, base });
  registerClimbOut(app, { engine, base });

  // Doors
  registerSecureDoor(app, { engine, base });
  registerBarricadeDoor(app, { engine, base });
  registerDebarricadeDoor(app, { engine, base });
  registerRepairDoor(app, { engine, base });

  // Stairs barricades
  registerBarricadeStairs(app, { engine, base });
  registerDebarricadeStairs(app, { engine, base });
};