// ld2030/v1/engine/state-writer-chat.js
// Chat feed writer (global/district/dm) with bounded seq log per scope.

const { CHAT_MAX_KEEP, normalizeScope } = require('../chat/chat-constants');

module.exports = function makeChatWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-chat: db is required');
  if (!admin) throw new Error('state-writer-chat: admin is required');
  if (!state) throw new Error('state-writer-chat: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  function ensureScope(scope) {
    const s = normalizeScope(scope);
    if (!s) throw new Error('chat: scope_required');
    return s;
  }

  function normalizeText(text) {
    const t = String(text || '').trim();
    if (!t) throw new Error('chat: text_required');
    return t.slice(0, 2000);
  }

  function safePos(pos) {
    if (!pos || typeof pos !== 'object') return null;
    const { x, y, z, layer } = pos;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z) ||
      !Number.isFinite(layer)
    ) {
      return null;
    }
    return { x, y, z, layer };
  }

  async function appendChatTx(tx, { gameId = 'lockdown2030', scope = 'global', message } = {}) {
    if (!tx) throw new Error('appendChatTx: tx_required');
    if (!gameId) throw new Error('appendChatTx: gameId_required');
    if (!message || typeof message !== 'object') throw new Error('appendChatTx: message_required');

    const s = ensureScope(scope);
    const text = normalizeText(message.text);

    if (typeof state.chatCol !== 'function' || typeof state.chatMetaDoc !== 'function') {
      throw new Error('appendChatTx: chat_col_missing');
    }

    const metaRef = state.chatMetaDoc(gameId, s);
    const metaSnap = await tx.get(metaRef);

    let nextSeq = 1;
    if (metaSnap.exists) {
      const meta = metaSnap.data() || {};
      const n = Number(meta.nextSeq);
      nextSeq = Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1;
    }

    const seq = nextSeq;
    const col = state.chatCol(gameId, s);
    const docRef = col.doc(`m_${seq}`);

    const payload = {
      seq,
      ts: serverTs(),
      type: 'CHAT',
      scope: s,
      uid: message.uid ? String(message.uid) : null,
      text,
      pos: safePos(message.pos),
      districtId: message.districtId != null ? String(message.districtId) : null,
      toUid: message.toUid ? String(message.toUid) : null,
    };

    tx.set(docRef, payload, { merge: false });

    const killSeq = seq - CHAT_MAX_KEEP;
    if (killSeq >= 1) {
      tx.delete(col.doc(`m_${killSeq}`));
    }

    tx.set(
      metaRef,
      {
        nextSeq: seq + 1,
        updatedAt: serverTs(),
      },
      { merge: true }
    );

    return { ok: true, seq };
  }

  async function appendChat(opts) {
    return db.runTransaction((tx) => appendChatTx(tx, opts));
  }

  return {
    appendChatTx,
    appendChat,
  };
};
