// ld2030/v1/engine/state-reader.js
// Centralized reads from Firestore.

module.exports = function makeStateReader({ db, state }) {
  return {
    async getGame(gameId) {
      const snap = await state.gameRef(gameId).get();
      return snap.exists ? snap.data() : null;
    },

    /**
     * Legacy helper. If state.mapRef is not wired, this safely returns null
     * instead of throwing on undefined.mapRef(...).
     */
    async getMap(mapId) {
      if (typeof state.mapRef !== 'function') {
        // No dedicated maps collection wired in state.js right now.
        return null;
      }
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

    zombiesCol(gameId) {
      return state.zombiesCol(gameId);
    },

    gameRef(gameId) {
      return state.gameRef(gameId);
    },

    /**
     * Pass-through for grid size so tick-zombies can call reader.readGridSize.
     */
    async readGridSize(gameId, fallback = { w: 32, h: 32 }) {
      if (typeof state.readGridSize === 'function') {
        return state.readGridSize(gameId, fallback);
      }
      return fallback;
    },
  };
};