// ld2030/v1/engine/state-writer-search.js
// Transactional search: spend AP + mutate spot progress + (later) spawn loot.

module.exports = function makeSearchStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-search: db is required');
  if (!admin) throw new Error('state-writer-search: admin is required');
  if (!state) throw new Error('state-writer-search: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  function spotIdFor({ inside, x, y, z }) {
    const prefix = inside ? 'i' : 'o';
    return `${prefix}_${x}_${y}_${z}`;
  }

  async function ensureCreatedAtTx(tx, ref) {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, { createdAt: serverTs() }, { merge: true });
      return;
    }
    const data = snap.data() || {};
    if (data.createdAt == null) tx.set(ref, { createdAt: serverTs() }, { merge: true });
  }

  async function searchSpot({ gameId, uid, apCost = 1, spot }) {
    if (!gameId) throw new Error('searchSpot: missing_gameId');
    if (!uid) throw new Error('searchSpot: missing_uid');
    if (!spot) throw new Error('searchSpot: missing_spot');

    const x = Number(spot.x);
    const y = Number(spot.y);
    const z = Number(spot.z);
    const inside = spot.inside === true;

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error('searchSpot: invalid_spot_coords');
    }

    const playerRef = state.playersCol(gameId).doc(uid);
    const spotsCol = state.spotsCol(gameId);
    const sId = spotIdFor({ inside, x, y, z });
    const spotRef = spotsCol.doc(sId);

    const result = await db.runTransaction(async (tx) => {
      await ensureCreatedAtTx(tx, playerRef);
      await ensureCreatedAtTx(tx, spotRef);

      const pSnap = await tx.get(playerRef);
      if (!pSnap.exists) throw new Error('searchSpot: player_not_found');
      const player = pSnap.data() || {};

      // hard requirement
      if (player.isInsideBuilding !== true) throw new Error('searchSpot: must_be_inside_building');

      // must match current player location
      const p = player.pos || {};
      const px = Number(p.x);
      const py = Number(p.y);
      const pz = Number(p.z ?? 0);

      if (px !== x || py !== y || pz !== z) throw new Error('searchSpot: not_at_spot');

      // AP spend
      const curAp = Number.isFinite(player.currentAp) ? player.currentAp : 0;
      const cost = Number.isFinite(apCost) ? apCost : 1;
      if (curAp < cost) throw new Error('searchSpot: not_enough_ap');

      // Spot progress (per-tile/per-floor)
      const sSnap = await tx.get(spotRef);
      const s = sSnap.exists ? (sSnap.data() || {}) : {};
      const remaining = Number.isFinite(s.remaining) ? s.remaining : 3; // default “search points” per spot
      if (remaining <= 0) throw new Error('searchSpot: spot_depleted');

      const nextRemaining = Math.max(0, remaining - 1);

      tx.set(
        spotRef,
        {
          inside,
          x,
          y,
          z,
          remaining: nextRemaining,
          updatedAt: serverTs(),
        },
        { merge: true }
      );

      tx.set(
        playerRef,
        {
          currentAp: Math.max(0, curAp - cost),
          updatedAt: serverTs(),
        },
        { merge: true }
      );

      // Loot spawning will go here (items at same {x,y,z} + inside flag),
      // but you wanted backend first: progress + AP is the backbone.

      return {
        ok: true,
        spotId: sId,
        spot: { inside, x, y, z },
        apCost: cost,
        currentAp: Math.max(0, curAp - cost),
        remaining: nextRemaining,
      };
    });

    return result;
  }

  return { searchSpot };
};