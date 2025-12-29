// ld2030/v1/engine/tx.js
// Tiny Firestore transaction helpers reused by writers.

module.exports = function makeTx({ db, admin }) {
  if (!db) throw new Error('tx: db is required');
  if (!admin) throw new Error('tx: admin is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  async function run(name, fn) {
    if (!name) throw new Error('tx.run: name required');
    if (typeof fn !== 'function') throw new Error('tx.run: fn required');

    try {
      return await db.runTransaction(async (tx) => fn(tx));
    } catch (err) {
      const prefix = `${name}: `;

      if (err && typeof err === 'object') {
        const msg = String(err.message || 'unknown_error');
        if (!msg.startsWith(prefix)) {
          try {
            err.message = `${prefix}${msg}`;
          } catch (_e) {
            throw new Error(`${prefix}${msg}`);
          }
        }
        throw err;
      }

      throw new Error(`${prefix}${String(err)}`);
    }
  }

  function setWithUpdatedAt(tx, ref, patch) {
    if (!tx) throw new Error('tx.setWithUpdatedAt: tx required');
    if (!ref) throw new Error('tx.setWithUpdatedAt: ref required');
    if (!patch || typeof patch !== 'object') throw new Error('tx.setWithUpdatedAt: patch required');

    tx.set(ref, { ...patch, updatedAt: serverTs() }, { merge: true });
  }

  function metaPatchForSnap(snap) {
    const cur = snap && snap.exists ? (snap.data() || {}) : {};
    const meta = { updatedAt: serverTs() };
    if (!snap || !snap.exists || cur.createdAt == null) {
      meta.createdAt = serverTs();
    }
    return meta;
  }

  function setWithMeta(tx, ref, patch, snap) {
    if (!tx) throw new Error('tx.setWithMeta: tx required');
    if (!ref) throw new Error('tx.setWithMeta: ref required');
    if (!patch || typeof patch !== 'object') throw new Error('tx.setWithMeta: patch required');

    const meta = metaPatchForSnap(snap);
    tx.set(ref, { ...patch, ...meta }, { merge: true });
  }

  return {
    run,
    serverTs,
    setWithUpdatedAt,
    metaPatchForSnap,
    setWithMeta,
  };
};
