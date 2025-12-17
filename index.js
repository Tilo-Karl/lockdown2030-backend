// index.js — Lockdown2030 backend entrypoint

const functions  = require('@google-cloud/functions-framework');
const express    = require('express');
const admin      = require('firebase-admin');

const makeState      = require('./ld2030/v1/state');
const makeGameEngine = require('./ld2030/v1/engine');

const registerInitGame = require('./ld2030/v1/init-game');
const registerJoinGame = require('./ld2030/v1/join-game');

// ✅ Single action registrar (move/attack/equip/search/enter/stairs/climb)
const registerActions = require('./ld2030/v1/actions');

// ---------------------------------------------
// Firebase setup
// ---------------------------------------------
if (!admin.apps.length) admin.initializeApp();

const db    = admin.firestore();
const state = makeState(db, admin);
const gameEngine = makeGameEngine({ db, admin, state });
const { tickEngine } = gameEngine;

// ---------------------------------------------
// Express setup
// ---------------------------------------------
const app = express();
app.use(express.json({ limit: '1mb' }));

const BASE = '/api/ld2030/v1';

// ---------------------------------------------
// Health check
// ---------------------------------------------
app.get(`${BASE}/health`, (_req, res) => res.json({ ok: true }));

// ---------------------------------------------
// Register API routes
// ---------------------------------------------
const ctx = { db, admin, state, base: BASE };

// Map + game setup
registerInitGame(app, ctx);

// Player join / spawn
registerJoinGame(app, ctx);

// ✅ All action endpoints in one place
registerActions(app, { engine: gameEngine, base: BASE });

// Tick endpoint (players + zombies)
app.post(`${BASE}/tick-game`, async (req, res) => {
  try {
    const { gameId = 'lockdown2030' } = req.body || {};
    const result = await tickEngine.tickGame({ gameId });
    return res.json(result);
  } catch (e) {
    console.error('tick-game error', e);
    return res.status(500).json({ ok: false, error: 'tick_failed' });
  }
});

// ---------------------------------------------
// Export cloud function
// ---------------------------------------------
functions.http('ld2030', app);