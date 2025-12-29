// ld2030/v1/engine/state-writer-search.js
// Transactional SEARCH (Big Bang V1 only):
// - spend AP
// - decrement cell.search.remaining (hard stop at 0)
// - (later) spawn loot
//
// BIG BANG V1 COMPLIANCE:
// - actor.pos is ALWAYS { x, y, z, layer } where layer ∈ {0,1}
// - NO legacy isInsideBuilding (layer is the truth)
// - SEARCH is inside-only (layer=1)

const makeTx = require('./tx');

module.exports = function makeSearchStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-search: db is required');
  if (!admin) throw new Error('state-writer-search: admin is required');
  if (!state) throw new Error('state-writer-search: state is required');

  const txHelpers = makeTx({ db, admin });
  const { run, setWithMeta } = txHelpers;

  function gameRef(gameId) {
    return (state && typeof state.gameRef === 'function')
      ? state.gameRef(gameId)
      : db.collection('games').doc(String(gameId));
  }

  function cellsCol(gameId) {
    if (typeof state.cellsCol === 'function') return state.cellsCol(gameId);
    return gameRef(gameId).collection('cells');
  }

  function parseCellId(cellId) {
    const m = /^c_(-?\d+)_(-?\d+)_(-?\d+)_(\d+)$/.exec(String(cellId || ''));
    if (!m) return null;

    const x = Number(m[1]);
    const y = Number(m[2]);
    const z = Number(m[3]);
    const layer = Number(m[4]);

    if (![x, y, z, layer].every(Number.isFinite)) return null;
    if (layer !== 0 && layer !== 1) return null;

    return { x, y, z, layer };
  }

  function nIntStrict(x, tag) {
    const v = Number(x);
    if (!Number.isFinite(v)) throw new Error(tag);
    return Math.trunc(v);
  }

  function requirePosStrict(actor, tag) {
    const p = actor?.pos;
    if (!p || typeof p !== 'object') throw new Error(`${tag}: missing_pos`);
    const x = nIntStrict(p.x, `${tag}: pos_x_invalid`);
    const y = nIntStrict(p.y, `${tag}: pos_y_invalid`);
    const z = nIntStrict(p.z, `${tag}: pos_z_invalid`);
    const layer = nIntStrict(p.layer, `${tag}: pos_layer_invalid`);
    if (layer !== 0 && layer !== 1) throw new Error(`${tag}: pos_layer_invalid`);
    return { x, y, z, layer };
  }

  async function searchCell({
    gameId,
    uid, // player id (search is player-only in this writer)
    cellId,
    apCost = 1,
    defaultMaxRemaining = 3,
  }) {
    if (!gameId) throw new Error('searchCell: missing_gameId');
    if (!uid) throw new Error('searchCell: missing_uid');
    if (!cellId) throw new Error('searchCell: missing_cellId');

    const parsed = parseCellId(cellId);
    if (!parsed) throw new Error('searchCell: invalid_cellId');

    const { x, y, z, layer } = parsed;

    // Big Bang search rule: must be inside (layer=1)
    if (layer !== 1) throw new Error('searchCell: must_be_inside');

    const id = String(cellId);
    const playerRef = state.playersCol(gameId).doc(String(uid));
    const cellRef = cellsCol(gameId).doc(id);

    const cost = Number.isFinite(apCost) ? Math.max(1, Math.trunc(apCost)) : 1;

    return run('searchCell', async (tx) => {
      const pSnap = await tx.get(playerRef);
      if (!pSnap.exists) throw new Error('searchCell: player_not_found');
      const player = pSnap.data() || {};

      const cSnap = await tx.get(cellRef);
      const cell = cSnap.exists ? (cSnap.data() || {}) : {};

      // Strict same-cell rule: (x,y,z,layer) must match exactly.
      const ppos = requirePosStrict(player, 'searchCell');
      if (ppos.x !== x || ppos.y !== y || ppos.z !== z || ppos.layer !== layer) {
        throw new Error('searchCell: not_at_cell');
      }

      // AP spend
      const curAp = Number.isFinite(player.currentAp) ? player.currentAp : 0;
      if (curAp < cost) throw new Error('searchCell: not_enough_ap');
      const nextAp = Math.max(0, curAp - cost);

      // Cell search progress
      const search = (cell.search && typeof cell.search === 'object') ? cell.search : {};
      const maxRemaining =
        Number.isFinite(search.maxRemaining) ? search.maxRemaining : defaultMaxRemaining;

      const remainingRaw =
        Number.isFinite(search.remaining) ? search.remaining : maxRemaining;

      const remaining = Math.trunc(remainingRaw);
      if (remaining <= 0) throw new Error('searchCell: cell_depleted');

      const nextRemaining = Math.max(0, remaining - 1);
      const nextCount = (Number.isFinite(search.searchedCount) ? search.searchedCount : 0) + 1;

      setWithMeta(tx, playerRef, { currentAp: nextAp }, pSnap);

      setWithMeta(
        tx,
        cellRef,
        {
          cellId: id,
          search: {
            ...search,
            maxRemaining,
            remaining: nextRemaining,
            searchedCount: nextCount,
          },
        },
        cSnap
      );

      return {
        ok: true,
        cellId: id,
        pos: { x, y, z, layer },
        apCost: cost,
        currentAp: nextAp,
        remaining: nextRemaining,
        maxRemaining,
      };
    });
  }

  return {
    searchCell,
    searchSpot: searchCell,
  };
};
