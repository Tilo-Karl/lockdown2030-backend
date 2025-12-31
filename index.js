// index.js — Lockdown2030 backend entrypoint

const functions  = require('@google-cloud/functions-framework');
const express    = require('express');
const admin      = require('firebase-admin');

const makeState      = require('./ld2030/v1/state');
const makeGameEngine = require('./ld2030/v1/engine');

const { makeActionRouter } = require('./ld2030/v1/engine/action-router');
const makeStateReader = require('./ld2030/v1/engine/state-reader');

const registerInitGame = require('./ld2030/v1/init-game');
const registerJoinGame = require('./ld2030/v1/join-game');
const registerActions  = require('./ld2030/v1/actions');

if (!admin.apps.length) admin.initializeApp();

const db    = admin.firestore();
const state = makeState(db, admin);

// Engine (verbs + tick)
const gameEngine = makeGameEngine({ db, admin, state });
const { engine, tickEngine } = gameEngine;

// ✅ Build action router (THIS is what routes call)
const actions = makeActionRouter({ engine });

// ✅ Reader for read-only endpoints (events feed)
const reader = makeStateReader({ db, state });

const app = express();
app.use(express.json({ limit: '1mb' }));

const BASE = '/api/ld2030/v1';

app.get(`${BASE}/health`, (_req, res) => res.json({ ok: true }));

const ctx = { db, admin, state, base: BASE };

registerInitGame(app, ctx);
registerJoinGame(app, ctx);

// ✅ pass actions + reader
registerActions(app, { actions, reader, base: BASE });

app.post(`${BASE}/tick-game`, async (req, res) => {
  try {
    const { gameId = 'lockdown2030' } = req.body || {};
    const now = new Date().toISOString();
    const result = await tickEngine.tickGame({ gameId, now });
    return res.json(result);
  } catch (e) {
    console.error('tick-game error', e);
    return res.status(500).json({ ok: false, error: 'tick_failed' });
  }
});

functions.http('ld2030', app);
