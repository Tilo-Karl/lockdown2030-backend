// ld2030/v1/engine/state-writer-events.js
// Bounded event feed writer (V1).
// MUST support appendEventsTx(tx, ...) so gameplay can emit events in the same transaction.

const { MAX_KEEP } = require('../events/event-constants');
const makeTx = require('./tx');

module.exports = function makeEventsWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-events: db is required');
  if (!admin) throw new Error('state-writer-events: admin is required');
  if (!state) throw new Error('state-writer-events: state is required');

  const txHelpers = makeTx({ db, admin });
  const { setWithMeta, serverTs, run } = txHelpers;

  function gameRef(gameId) {
    return (state && typeof state.gameRef === 'function')
      ? state.gameRef(gameId)
      : db.collection('games').doc(String(gameId));
  }

  function eventsCol(gameId) {
    if (typeof state.eventsCol === 'function') return state.eventsCol(gameId);
    return gameRef(gameId).collection('events');
  }

  function eventMetaDoc(gameId) {
    if (typeof state.eventMetaDoc === 'function') return state.eventMetaDoc(gameId);
    return gameRef(gameId).collection('eventMeta').doc('feed');
  }

  function toInt(n, fallback) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.trunc(x);
  }

  function normalizeArgs(args) {
    if (!args || typeof args !== 'object' || Array.isArray(args)) return {};
    return args;
  }

  // REQUIRED: tx-aware append for atomic gameplay + events
  async function appendEventsTx(tx, { gameId = 'lockdown2030', events } = {}) {
    if (!tx) throw new Error('appendEventsTx: tx_required');
    if (!gameId) throw new Error('appendEventsTx: gameId_required');

    const arr = Array.isArray(events) ? events : [];
    if (arr.length === 0) return { ok: true, appended: 0, fromSeq: null, toSeq: null, nextSeq: null };

    const metaRef = eventMetaDoc(gameId);
    const metaSnap = await tx.get(metaRef);

    let nextSeq = 1;
    if (metaSnap.exists) {
      const meta = metaSnap.data() || {};
      const n = toInt(meta.nextSeq, 1);
      nextSeq = n >= 1 ? n : 1;
    }

    const col = eventsCol(gameId);

    let fromSeq = nextSeq;
    let seq = nextSeq;

    for (const e of arr) {
      const type = String(e?.type || '').trim();
      const messageKey = String(e?.messageKey || '').trim();
      if (!type) throw new Error('appendEventsTx: event_type_required');
      if (!messageKey) throw new Error('appendEventsTx: messageKey_required');

      const docId = `e_${seq}`;
      const ref = col.doc(docId);

      const doc = {
        seq,
        ts: serverTs(),
        type,
        messageKey,
        args: normalizeArgs(e?.args),

        actorId: e?.actorId ? String(e.actorId) : null,
        targetId: e?.targetId ? String(e.targetId) : null,
        pos: e?.pos && typeof e.pos === 'object' ? e.pos : null,
      };

      tx.set(ref, doc, { merge: false });

      // bounded retention: delete exactly one old doc per new event (no scans)
      const killSeq = seq - MAX_KEEP;
      if (killSeq >= 1) {
        tx.delete(col.doc(`e_${killSeq}`));
      }

      seq += 1;
    }

    const toSeq = seq - 1;

    setWithMeta(tx, metaRef, { nextSeq: seq }, metaSnap);

    return { ok: true, appended: arr.length, fromSeq, toSeq, nextSeq: seq };
  }

  async function appendEvents({ gameId = 'lockdown2030', events } = {}) {
    return run('appendEvents', (tx) => appendEventsTx(tx, { gameId, events }));
  }

  return {
    appendEventsTx,
    appendEvents,
  };
};
