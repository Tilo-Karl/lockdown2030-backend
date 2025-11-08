const functions  = require('@google-cloud/functions-framework');
const express    = require('express');
const admin      = require('firebase-admin');
const makeState  = require('./ld2030/v1/state');

// modular route registrars you already have
const registerInitGame = require('./ld2030/v1/init-game');
const registerJoinGame = require('./ld2030/v1/join-game');
const registerMovePlayer  = require('./ld2030/v1/move-player');
const registerAttackPlayer = require('./ld2030/v1/attack-player');

if (!admin.apps.length) admin.initializeApp();
const db    = admin.firestore();
const state = makeState(db, admin);

const app = express();
app.use(express.json({ limit: '1mb' }));

// ----- new API base for Lockdown 2030 -----
const BASE = '/api/ld2030/v1';

// health-check (service heartbeat, not player HP)
app.get(`${BASE}/health`, (_req, res) => res.json({ ok: true }));

// pass base to registrars (they can ignore it if not used yet)
const ctx = { db, admin, state, base: BASE };
registerInitGame(app, ctx);
registerJoinGame(app, ctx);
registerMovePlayer(app, ctx);
registerAttackPlayer(app, ctx);

// exported function name (entry point) renamed to ld2030
functions.http('ld2030', app);