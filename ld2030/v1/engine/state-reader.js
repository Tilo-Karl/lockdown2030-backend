// ld2030/v1/engine/state-reader.js
// Centralized reads from Firestore.

module.exports = function makeStateReader({ db, state }) {
  return {
    async getGame(gameId) {
      const snap = await state.gameRef(gameId).get();
      return snap.exists ? snap.data() : null;
    },

    async getPlayer(gameId, uid) {
      const snap = await state.playersCol(gameId).doc(uid).get();
      return snap.exists ? snap.data() : null;
    },

    async getItem(gameId, itemId) {
      const snap = await state.itemsCol(gameId).doc(itemId).get();
      return snap.exists ? snap.data() : null;
    },

    async getSpot(gameId, spotId) {
      const snap = await state.spotsCol(gameId).doc(spotId).get();
      return snap.exists ? snap.data() : null;
    },

    playersCol(gameId) {
      return state.playersCol(gameId);
    },

    zombiesCol(gameId) {
      return state.zombiesCol(gameId);
    },

    humansCol(gameId) {
      return state.humansCol(gameId);
    },

    itemsCol(gameId) {
      return state.itemsCol(gameId);
    },

    spotsCol(gameId) {
      return state.spotsCol(gameId);
    },

    gameRef(gameId) {
      return state.gameRef(gameId);
    },

    async readGridSize(gameId, fallback = { w: 32, h: 32 }) {
      if (typeof state.readGridSize === 'function') {
        return state.readGridSize(gameId, fallback);
      }
      return fallback;
    },
  };
};