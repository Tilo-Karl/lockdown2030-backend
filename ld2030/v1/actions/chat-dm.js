// ld2030/v1/actions/chat-dm.js
// GET/POST /chat/dm (requires sender district ISP ON)

const {
  scopeForDm,
  CHAT_DEFAULT_LIMIT,
} = require('../chat/chat-constants');
const { cellIdFor } = require('./validators');

function normalizeGameId(value) {
  const g = String(value || 'lockdown2030').trim();
  return g || 'lockdown2030';
}

function normalizeUid(value, field = 'uid') {
  const uid = String(value || '').trim();
  if (!uid) {
    const err = new Error(`${field}_required`);
    err.code = `${field}_required`;
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

function httpError(code, status = 400) {
  const err = new Error(code);
  err.code = code;
  err.status = status;
  return err;
}

async function ensureSenderCanChat(reader, gameId, uid) {
  const actor = await reader.getActor(gameId, uid);
  if (!actor) throw httpError('actor_not_found', 404);
  const pos = actor.pos;
  if (!pos || typeof pos !== 'object') throw httpError('actor_pos_missing');
  const cellId = cellIdFor(pos.x, pos.y, pos.z, pos.layer);
  const cell = await reader.getCell(gameId, cellId);
  if (!cell) throw httpError('cell_not_found');
  const districtId = cell.districtId != null ? String(cell.districtId) : '';
  if (!districtId) throw httpError('district_unknown');
  const districtState = await reader.getDistrictState(gameId, districtId);
  if (!districtState || districtState.ispOn !== true) throw httpError('isp_off', 403);
  return { actor, districtId };
}

module.exports = function registerChatDm(app, { reader, writer, base } = {}) {
  if (!app) throw new Error('chat-dm: app is required');
  if (!reader || typeof reader.getActor !== 'function' || typeof reader.listChat !== 'function') {
    throw new Error('chat-dm: reader with getActor + listChat is required');
  }
  if (!writer || typeof writer.appendChat !== 'function') {
    throw new Error('chat-dm: writer.appendChat is required');
  }

  const BASE = String(base || '').trim() || '/api/ld2030/v1';

  app.post(`${BASE}/chat/dm`, async (req, res) => {
    try {
      const body = req.body || {};
      const uid = normalizeUid(body.uid);
      const toUid = normalizeUid(body.toUid, 'toUid');
      const text = normalizeText(body.text);
      const gameId = normalizeGameId(body.gameId);

      const { actor, districtId } = await ensureSenderCanChat(reader, gameId, uid);
      const scope = scopeForDm(uid, toUid);

      await writer.appendChat({
        gameId,
        scope,
        message: {
          uid,
          toUid,
          text,
          districtId,
          pos: actor.pos || null,
        },
      });

      return res.json({ ok: true });
    } catch (e) {
      console.error('chat-dm post error', e);
      const status = e.status || 400;
      const error = e.code || 'chat_failed';
      return res.status(status).json({ ok: false, error });
    }
  });

  app.get(`${BASE}/chat/dm`, async (req, res) => {
    try {
      const uid = normalizeUid(req.query?.uid);
      const toUid = normalizeUid(req.query?.toUid, 'toUid');
      const gameId = normalizeGameId(req.query?.gameId);
      const limit = parseNumber(req.query?.limit) ?? CHAT_DEFAULT_LIMIT;
      const beforeSeq = parseBeforeSeq(req.query?.beforeSeq);

      await ensureSenderCanChat(reader, gameId, uid);
      const scope = scopeForDm(uid, toUid);

      const result = await reader.listChat(gameId, { scope, limit, beforeSeq });
      return res.json(result);
    } catch (e) {
      console.error('chat-dm get error', e);
      const status = e.status || 400;
      const error = e.code || 'chat_fetch_failed';
      return res.status(status).json({ ok: false, error });
    }
  });
};
