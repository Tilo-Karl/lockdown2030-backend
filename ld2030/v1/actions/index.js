// ld2030/v1/actions/index.js
// One place to register all action endpoints (move/attack/equip/search/enter/stairs/climb/doors/stairs-barricades/stand-up/repair-cell/chat).

const admin = require('firebase-admin');
const makeState = require('../state');
const makeChatWriter = require('../engine/state-writer-chat');
const registerMove             = require('./move');
const registerAttackEntity      = require('./attack-entity');
const registerEquipItem         = require('./equip-item');
const registerUnequipItem       = require('./unequip-item');
const registerSearch            = require('./search');

const registerStandUp           = require('./stand-up');

const registerSecureDoor        = require('./secure-door');
const registerBarricadeDoor     = require('./barricade-door');
const registerDebarricadeDoor   = require('./debarricade-door');
const registerRepairDoor        = require('./repair-door');

// NEW: cell repair
const registerRepairCell        = require('./repair-cell');

const registerBarricadeStairs   = require('./barricade-stairs');
const registerDebarricadeStairs = require('./debarricade-stairs');

// NEW: events feed endpoint
const registerEvents            = require('./events');
const registerChatGlobal        = require('./chat-global');
const registerChatDistrict      = require('./chat-district');
const registerChatDm            = require('./chat-dm');

let sharedChatWriter = null;

function getChatWriter() {
  if (sharedChatWriter) return sharedChatWriter;
  const db = admin.firestore();
  const state = makeState(db, admin);
  sharedChatWriter = makeChatWriter({ db, admin, state });
  return sharedChatWriter;
}

module.exports = function registerActions(app, { actions, base, reader }) {
  if (!app) throw new Error('registerActions: app is required');
  if (!actions) throw new Error('registerActions: actions is required');
  if (!base) throw new Error('registerActions: base is required');
  if (!reader) throw new Error('registerActions: reader is required');

  // Feed (read-only)
  registerEvents(app, { reader, base });
  const chatWriterInstance = getChatWriter();
  registerChatGlobal(app, { reader, writer: chatWriterInstance, base });
  registerChatDistrict(app, { reader, writer: chatWriterInstance, base });
  registerChatDm(app, { reader, writer: chatWriterInstance, base });

  // Actions (mutations)
  registerMove(app, { actions, base });
  registerAttackEntity(app, { actions, base });

  registerEquipItem(app, { actions, base });
  registerUnequipItem(app, { actions, base });

  registerSearch(app, { actions, base });

  registerStandUp(app, { actions, base });

  // Doors
  registerSecureDoor(app, { actions, base });
  registerBarricadeDoor(app, { actions, base });
  registerDebarricadeDoor(app, { actions, base });
  registerRepairDoor(app, { actions, base });

  // NEW: inside cell repair (structure/fuse/water/generator)
  registerRepairCell(app, { actions, base });

  // Stairs barricades
  registerBarricadeStairs(app, { actions, base });
  registerDebarricadeStairs(app, { actions, base });
};
