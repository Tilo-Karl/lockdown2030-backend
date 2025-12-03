// ld2030/v1/engine/index.js
// Wires reader + writer + engine + router together.

const makeStateReader = require('./state-reader');
const makeStateWriter = require('./state-writer');
const { makeEngine } = require('./engine');
const { makeActionRouter } = require('./action-router');
const { makeTickEngine } = require('../tick');

function makeGameEngine({ db, admin, state }) {
  const reader = makeStateReader({ db, state });
  const writer = makeStateWriter({ db, admin, state });
  const engine = makeEngine({ reader, writer });
  const tickEngine = makeTickEngine({ reader, writer });
  const router = makeActionRouter({ engine });

  return {
    reader,
    writer,
    engine,
    tickEngine,
    router,
  };
}

module.exports = makeGameEngine;