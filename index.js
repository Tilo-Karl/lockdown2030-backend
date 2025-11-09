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

// Inline join-game POST endpoint (mirrors ./ld2030/v1/join-game.js)
app.post(`${BASE}/join-game`, async (req, res) => {
  try {
    const { gameId, uid } = req.body || {};
    if (!gameId || typeof gameId !== 'string' || !uid || typeof uid !== 'string') {
      return res.status(400).json({ ok: false, reason: 'Missing or invalid gameId or uid' });
    }
    const gameRef = db.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(uid);
    let playerSnap = await playerRef.get();
    let playerData;
    if (!playerSnap.exists) {
      // Create new player with default state (mimic join-game.js logic)
      // We'll place player at a random position in a 10x10 grid and give default hp/ap
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);
      const hp = 10, ap = 2;
      playerData = { x, y, hp, ap, joinedAt: Date.now() };
      await playerRef.set(playerData);
    } else {
      playerData = playerSnap.data();
    }
    // Return only the required fields
    return res.json({
      ok: true,
      x: playerData.x,
      y: playerData.y,
      hp: playerData.hp,
      ap: playerData.ap
    });
  } catch (err) {
    return res.status(500).json({ ok: false, reason: err && err.message ? err.message : 'Internal error' });
  }
});

// pass base to registrars (they can ignore it if not used yet)
const ctx = { db, admin, state, base: BASE };
registerInitGame(app, ctx);
registerJoinGame(app, ctx);
registerMovePlayer(app, ctx);
registerAttackPlayer(app, ctx);

// exported function name (entry point) renamed to ld2030
functions.http('ld2030', app);