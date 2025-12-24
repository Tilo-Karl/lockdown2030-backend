// ld2030/v1/actions/chat-global.js
// GET/POST /chat/global

const {
  scopeGlobal,
  CHAT_DEFAULT_LIMIT,
} = require('../chat/chat-constants');

function normalizeGameId(value) {
  const g = String(value || 'lockdown2030').trim();
  return g || 'lockdown2030';
}

function normalizeUid(value) {
  const uid = String(value || '').trim();
  if (!uid) {
    const err = new Error('uid_required');
    err.code = 'uid_required';
    throw err;
  }
  return uid;
}

function normalizeText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    const err = new Error('text_required');
    err.code = 'text_required';
    throw err;
  }
  return text.slice(0, 2000);
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseBeforeSeq(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = function registerChatGlobal(app, { reader, writer, base } = {}) {
  if (!app) throw new Error('chat-global: app is required');
  if (!reader || typeof reader.getActor !== 'function' || typeof reader.listChat !== 'function') {
    throw new Error('chat-global: reader with getActor + listChat is required');
  }
  if (!writer || typeof writer.appendChat !== 'function') {
    throw new Error('chat-global: writer.appendChat is required');
  }

  const BASE = String(base || '').trim() || '/api/ld2030/v1';
  const SCOPE = scopeGlobal();

  app.post(`${BASE}/chat/global`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = normalizeUid(body.uid);
      const text = normalizeText(body.text);
      const gameId = normalizeGameId(body.gameId);

      const actor = await reader.getActor(gameId, uid);
      if (!actor) {
        return res.status(404).json({ ok: false, error: 'actor_not_found' });
      }

      await writer.appendChat({
        gameId,
        scope: SCOPE,
        message: {
          uid,
          text,
          pos: actor.pos || null,
        },
      });

      return res.json({ ok: true });
    } catch (e) {
      console.error('chat-global post error', e);
      const status = 400;
      const error = e.code || 'chat_failed';
      return res.status(status).json({ ok: false, error });
    }
  });

  app.get(`${BASE}/chat/global`, async (req, res) => {
    try {
      const gameId = normalizeGameId(req.query?.gameId);
      const limit = parseNumber(req.query?.limit) ?? CHAT_DEFAULT_LIMIT;
      const beforeSeq = parseBeforeSeq(req.query?.beforeSeq);

      const result = await reader.listChat(gameId, { scope: SCOPE, limit, beforeSeq });
      return res.json(result);
    } catch (e) {
      console.error('chat-global get error', e);
      return res.status(400).json({ ok: false, error: 'chat_fetch_failed' });
    }
  });
};
