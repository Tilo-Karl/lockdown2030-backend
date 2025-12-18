// State reader used by engine + tick.
// Adds door reads via state.doorsCol.
// Adds stairs-edge reads via state.stairsCol.

module.exports = function makeStateReader({ db, state }) {
  if (!db) throw new Error('state-reader: db is required');
  if (!state) throw new Error('state-reader: state is required');

  async function getGame(gameId) {
    const ref = state.gameRef(gameId);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getPlayer(gameId, uid) {
    const ref = state.playersCol(gameId).doc(uid);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getDoor(gameId, doorId) {
    if (typeof state.doorsCol !== 'function') return null;
    const ref = state.doorsCol(gameId).doc(doorId);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  async function getStairEdge(gameId, edgeId) {
    if (typeof state.stairsCol !== 'function') return null;
    const ref = state.stairsCol(gameId).doc(edgeId);
    const snap = await ref.get();
    return snap.exists ? (snap.data() || {}) : null;
  }

  // passthroughs used by tick
  const playersCol = (gameId) => state.playersCol(gameId);
  const zombiesCol = (gameId) => state.zombiesCol(gameId);
  const humansCol  = (gameId) => state.humansCol(gameId);
  const itemsCol   = (gameId) => state.itemsCol(gameId);
  const spotsCol   = (gameId) => state.spotsCol(gameId);
  const doorsCol   = (gameId) => (typeof state.doorsCol === 'function' ? state.doorsCol(gameId) : null);
  const stairsCol  = (gameId) => (typeof state.stairsCol === 'function' ? state.stairsCol(gameId) : null);

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
    getPlayer,
    getDoor,
    getStairEdge,

    playersCol,
    zombiesCol,
    humansCol,
    itemsCol,
    spotsCol,
    doorsCol,
    stairsCol,

    readGridSize,
  };
};