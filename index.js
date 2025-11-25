const functions  = require('@google-cloud/functions-framework');
const express    = require('express');
const admin      = require('firebase-admin');
const makeState  = require('./ld2030/v1/state');
const makeGameEngine = require('./ld2030/v1/engine');

if (!admin.apps.length) admin.initializeApp();
const db    = admin.firestore();
const state = makeState(db, admin);
const gameEngine = makeGameEngine({ db, admin, state });
const router = gameEngine.router;

const app = express();
app.use(express.json({ limit: '1mb' }));

// ----- new API base for Lockdown 2030 -----
const BASE = '/api/ld2030/v1';

// health-check (service heartbeat, not player HP)
app.get(`${BASE}/health`, (_req, res) => res.json({ ok: true }));

app.post(`${BASE}/action`, express.json(), (req, res) => router.handle(req, res));

// exported function name (entry point) renamed to ld2030
functions.http('ld2030', app);