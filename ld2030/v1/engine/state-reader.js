// ld2030/v1/engine/state-reader.js
// State reader used by engine + tick.
// Big Bang V1 reads runtime truth from cells/edges/districtState/noiseTiles.

const { DEFAULT_LIMIT, MAX_LIMIT } = require('../events/event-constants');
const {
  CHAT_DEFAULT_LIMIT,
  CHAT_MAX_LIMIT,
  normalizeScope,
} = require('../chat/chat-constants');

module.exports = function makeStateReader({ db, state }) {
  if (!db) throw new Error('state-reader: db is required');
  if (!state) throw new Error('state-reader: state is required');

  function gameRef(gameId) {
    return (state && typeof state.gameRef === 'function')
      ? state.gameRef(gameId)
      : db.collection('games').doc(String(gameId));
  }

  // Runtime world collections (stable even if state.*Col helpers aren’t defined)
  function cellsCol(gameId) {
    if (typeof state.cellsCol === 'function') return state.cellsCol(gameId);
    return gameRef(gameId).collection('cells');
  }
  function edgesCol(gameId) {
    if (typeof state.edgesCol === 'function') return state.edgesCol(gameId);
    return gameRef(gameId).collection('edges');
  }
  function districtStateCol(gameId) {
    if (typeof state.districtStateCol === 'function') return state.districtStateCol(gameId);
    return gameRef(gameId).collection('districtState');
  }
  function noiseTilesCol(gameId) {
    if (typeof state.noiseTilesCol === 'function') return state.noiseTilesCol(gameId);
    return gameRef(gameId).collection('noiseTiles');
  }

  // Events feed collections
  function eventsCol(gameId) {
    if (typeof state.eventsCol === 'function') return state.eventsCol(gameId);
    return gameRef(gameId).collection('events');
  }
  function chatCol(gameId, scope) {
    if (typeof state.chatCol === 'function') return state.chatCol(gameId, scope);
    const s = normalizeScope(scope);
    return gameRef(gameId).collection('chat').doc(s).collection('messages');
  }

  async function getGame(gameId) {
    const ref = gameRef(gameId);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getPlayer(gameId, uid) {
    const ref = state.playersCol(gameId).doc(uid);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getActor(gameId, uid) {
    const id = String(uid);
    const cols = [
      state.playersCol(gameId),
      state.zombiesCol(gameId),
      state.humansCol(gameId),
    ];

    for (const col of cols) {
      const ref = col.doc(id);
      const snap = await ref.get();
      if (snap.exists) return (snap.data() || {});
    }
    return null;
  }

  async function getItem(gameId, itemId) {
    const id = String(itemId);
    const ref = state.itemsCol(gameId).doc(id);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getCell(gameId, cellId) {
    const id = String(cellId);
    const ref = cellsCol(gameId).doc(id);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getEdge(gameId, edgeId) {
    const id = String(edgeId);
    const ref = edgesCol(gameId).doc(id);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getDistrictState(gameId, districtId) {
    const id = String(districtId);
    const ref = districtStateCol(gameId).doc(id);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  function clampLimit(limit) {
    const n = Number(limit);
    if (!Number.isFinite(n)) return DEFAULT_LIMIT;
    const v = Math.trunc(n);
    if (v < 1) return 1;
    if (v > MAX_LIMIT) return MAX_LIMIT;
    return v;
  }

  async function listEvents(gameId, { limit = DEFAULT_LIMIT, beforeSeq = null } = {}) {
    const L = clampLimit(limit);

    let q = eventsCol(gameId).orderBy('seq', 'desc');

    if (beforeSeq !== null && beforeSeq !== undefined && beforeSeq !== '') {
      const b = Number(beforeSeq);
      if (Number.isFinite(b)) {
        q = q.where('seq', '<', Math.trunc(b));
      }
    }

    const snap = await q.limit(L).get();

    const out = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      out.push({
        seq: d.seq ?? null,
        ts: d.ts ?? null,
        type: d.type ?? null,
        messageKey: d.messageKey ?? null,
        args: d.args ?? {},
        actorId: d.actorId ?? null,
        targetId: d.targetId ?? null,
        pos: d.pos ?? null,
      });
    });

    return out;
  }

  function clampChatLimit(limit) {
    const n = Number(limit);
    if (!Number.isFinite(n)) return CHAT_DEFAULT_LIMIT;
    const v = Math.trunc(n);
    if (v < 1) return 1;
    if (v > CHAT_MAX_LIMIT) return CHAT_MAX_LIMIT;
    return v;
  }

  async function listChat(gameId, { scope = 'global', limit = CHAT_DEFAULT_LIMIT, beforeSeq = null } = {}) {
    const s = normalizeScope(scope);
    const L = clampChatLimit(limit);

    let q = chatCol(gameId, s).orderBy('seq', 'desc');
    if (beforeSeq !== null && beforeSeq !== undefined && beforeSeq !== '') {
      const b = Number(beforeSeq);
      if (Number.isFinite(b)) {
        q = q.where('seq', '<', Math.trunc(b));
      }
    }

    const snap = await q.limit(L).get();
    const messages = [];
    let minSeq = null;

    snap.forEach((doc) => {
      const d = doc.data() || {};
      const seq = d.seq ?? null;
      if (seq != null) {
        minSeq = (minSeq == null) ? seq : Math.min(minSeq, seq);
      }
      messages.push({
        seq,
        ts: d.ts ?? null,
        type: d.type ?? 'CHAT',
        scope: d.scope ?? s,
        uid: d.uid ?? null,
        text: d.text ?? '',
        pos: d.pos ?? null,
        districtId: d.districtId ?? null,
        toUid: d.toUid ?? null,
      });
    });

    const nextBeforeSeq =
      (messages.length === L && minSeq != null) ? minSeq : null;

    return { ok: true, messages, nextBeforeSeq };
  }

  // passthroughs used by tick/engine
  const playersCol = (gameId) => state.playersCol(gameId);
  const zombiesCol = (gameId) => state.zombiesCol(gameId);
  const humansCol  = (gameId) => state.humansCol(gameId);
  const itemsCol   = (gameId) => state.itemsCol(gameId);

  async function readGridSize(gameId, fallback = { w: 32, h: 32 }) {
    if (typeof state.readGridSize === 'function') {
      return state.readGridSize(gameId, fallback);
    }
    const g = await getGame(gameId);
    if (!g) return fallback;
    return {
      w: g.gridsize?.w ?? g.w ?? fallback.w,
      h: g.gridsize?.h ?? g.h ?? fallback.h,
    };
  }

  return {
    getGame,

    // legacy
    getPlayer,

    // unified actor read
    getActor,

    // items
    getItem,

    // runtime world
    getCell,
    getEdge,
    getDistrictState,

    // events
    listEvents,
    listChat,

    // collections
    playersCol,
    zombiesCol,
    humansCol,
    itemsCol,

    cellsCol,
    edgesCol,
    districtStateCol,
    noiseTilesCol,

    readGridSize,
  };
};
