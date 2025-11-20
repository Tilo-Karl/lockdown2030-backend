// ld2030/v1/engine/state-reader.js
// Centralized reads from Firestore.

module.exports = function makeStateReader({ db, state }) {
  return {
    async getGame(gameId) {
      const snap = await state.gameRef(gameId).get();
      return snap.exists ? snap.data() : null;
    },

    async getMap(mapId) {
      const snap = await state.mapRef(mapId).get();
      return snap.exists ? snap.data() : null;
    },

    async getPlayer(gameId, uid) {
      const snap = await state.playersCol(gameId).doc(uid).get();
      return snap.exists ? snap.data() : null;
    },

    playersCol(gameId) {
      return state.playersCol(gameId);
    },

    gameRef(gameId) {
      return state.gameRef(gameId);
    },
  };
};