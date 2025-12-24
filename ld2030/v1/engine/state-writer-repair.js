// ld2030/v1/engine/state-writer-repair.js
// Atomic inside-cell repair writer (V1).
//
// Single tx does:
// - read actor + inside cell
// - pick repair target (structure/fuse/water/generator)
// - spend AP
// - consume/decay required item (toolkit/fuse kit/pipe patch/battery)
// - patch cell
// - if cell is district facility cell: progress objectives + refresh district utility flags
// - optionally emit events (same tx)
//
// Contract: this writer is the source of truth for repair invariants.
// Handler stays thin.

const {
  resolveCellRepairTarget,
  apCostForRepair,
  patchRepairInsideStructure,
  patchRepairFuse,
  patchRepairWater,
  patchRepairGenerator,
} = require('../actions/repair-rules');

const {
  applyObjectiveAction,
  utilityOnFromFacilityCell,
} = require('../world/district-state');

const makeEventsWriter = require('./state-writer-events');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function merge1Level(base, patch) {
  const b = isObj(base) ? base : {};
  const p = isObj(patch) ? patch : {};
  const out = { ...b };

  for (const [k, v] of Object.entries(p)) {
    if (isObj(v) && isObj(out[k])) {
      out[k] = { ...(isObj(out[k]) ? out[k] : {}), ...v };
    } else {
      out[k] = v;
    }
  }

  return out;
}

module.exports = function makeRepairWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-repair: db is required');
  if (!admin) throw new Error('state-writer-repair: admin is required');
  if (!state) throw new Error('state-writer-repair: state is required');

  const eventsWriter = makeEventsWriter({ db, admin, state });
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  function gameRef(gameId) {
    return (state && typeof state.gameRef === 'function')
      ? state.gameRef(gameId)
      : db.collection('games').doc(String(gameId));
  }

  function cellsCol(gameId) {
    if (typeof state.cellsCol === 'function') return state.cellsCol(gameId);
    return gameRef(gameId).collection('cells');
  }

  function itemsCol(gameId) {
    if (typeof state.itemsCol === 'function') return state.itemsCol(gameId);
    return gameRef(gameId).collection('items');
  }

  function districtStateCol(gameId) {
    if (typeof state.districtStateCol === 'function') return state.districtStateCol(gameId);
    return gameRef(gameId).collection('districtState');
  }

  function metaPatchForSnap(snap) {
    const ts = serverTs();
    const cur = snap && snap.exists ? (snap.data() || {}) : {};
    const meta = { updatedAt: ts };
    if (!snap || !snap.exists || cur.createdAt == null) meta.createdAt = ts;
    return meta;
  }

  async function findActorByIdTx(tx, gameId, actorId) {
    const id = String(actorId);
    const cols = [
      { label: 'players', col: state.playersCol(gameId) },
      { label: 'zombies', col: state.zombiesCol(gameId) },
      { label: 'humans',  col: state.humansCol(gameId) },
    ];

    for (const c of cols) {
      const ref = c.col.doc(id);
      const snap = await tx.get(ref);
      if (snap.exists) return { ref, label: c.label, snap, data: (snap.data() || {}) };
    }
    return null;
  }

  function requireInsidePos(actor) {
    const p = actor?.pos;
    if (!p || typeof p !== 'object') throw new Error('REPAIR_CELL: missing_pos');

    const x = nInt(p.x, NaN);
    const y = nInt(p.y, NaN);
    const z = nInt(p.z, NaN);
    const layer = nInt(p.layer, NaN);

    if (![x, y, z, layer].every(Number.isFinite)) throw new Error('REPAIR_CELL: pos_invalid');
    if (layer !== 1) throw new Error('REPAIR_CELL: must_be_inside');

    return { x, y, z, layer };
  }

  function cellIdForPos(pos) {
    return `c_${pos.x}_${pos.y}_${pos.z}_${pos.layer}`;
  }

  async function findInventoryItemByKindTx(tx, gameId, actor, wantKind) {
    const inv = Array.isArray(actor?.inventory) ? actor.inventory : [];
    const col = itemsCol(gameId);

    for (const itemId of inv) {
      const id = String(itemId || '').trim();
      if (!id) continue;
      const ref = col.doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) continue;

      const item = snap.data() || {};
      if (String(item.type || '').toUpperCase() !== 'ITEM') continue;
      if (String(item.kind || '') === String(wantKind)) {
        return { itemId: id, ref, snap, item };
      }
    }

    return null;
  }

  function removeFromInventory(inv, itemId) {
    const arr = Array.isArray(inv) ? inv.slice() : [];
    const id = String(itemId || '');
    return arr.filter((x) => String(x) !== id);
  }

  function applyCellPatchToData(cellData, patch) {
    // merge 1-level for component objects; patch keys overwrite
    return merge1Level(cellData, patch);
  }

  function requiredItemKindForTarget(target) {
    switch (target) {
      case 'structure': return 'TOOLKIT';
      case 'fuse': return 'FUSE_KIT';
      case 'water': return 'PIPE_PATCH';
      case 'generator': return 'BATTERY';
      default: return null;
    }
  }

  async function repairCell({ gameId = 'lockdown2030', actorId, preferred = null } = {}) {
    if (!actorId) throw new Error('repairCell: missing_actorId');

    const gId = String(gameId || 'lockdown2030').trim() || 'lockdown2030';
    const aId = String(actorId).trim();

    await db.runTransaction(async (tx) => {
      const actorInfo = await findActorByIdTx(tx, gId, aId);
      if (!actorInfo) throw new Error('REPAIR_CELL: actor_not_found');

      const actor = actorInfo.data || {};

      // V1: player-only AP spending
      if (String(actor.type || '').toUpperCase() !== 'HUMAN') throw new Error('REPAIR_CELL: actor_not_human');
      if (actor.isPlayer !== true) throw new Error('REPAIR_CELL: players_only');

      const pos = requireInsidePos(actor);
      const cellId = cellIdForPos(pos);

      const cRef = cellsCol(gId).doc(cellId);
      const cSnap = await tx.get(cRef);
      if (!cSnap.exists) throw new Error('REPAIR_CELL: cell_not_found');
      const cell = cSnap.data() || {};

      const target = resolveCellRepairTarget(cell, preferred);
      if (!target) throw new Error('REPAIR_CELL: nothing_to_repair');

      const apCost = apCostForRepair(target);
      const curAp = nInt(actor.currentAp, 0);
      if (curAp < apCost) throw new Error('REPAIR_CELL: not_enough_ap');
      const nextAp = Math.max(0, curAp - apCost);

      // Determine + locate required item
      const needKind = requiredItemKindForTarget(target);
      if (!needKind) throw new Error('REPAIR_CELL: unknown_target');

      const itemInfo = await findInventoryItemByKindTx(tx, gId, actor, needKind);
      if (!itemInfo) throw new Error(`REPAIR_CELL: missing_item_${needKind}`);

      // Compute cell patch
      let cellPatch = null;
      if (target === 'structure') cellPatch = patchRepairInsideStructure(cell);
      else if (target === 'fuse') cellPatch = patchRepairFuse(cell);
      else if (target === 'water') cellPatch = patchRepairWater(cell);
      else if (target === 'generator') cellPatch = patchRepairGenerator(cell);
      else throw new Error('REPAIR_CELL: invalid_target');

      // Consume / decay item
      let invAfter = Array.isArray(actor.inventory) ? actor.inventory.slice() : [];
      const itemId = itemInfo.itemId;
      const item = itemInfo.item || {};
      const itemRef = itemInfo.ref;

      const itemWrites = [];
      const itemDeletes = [];

      if (needKind === 'FUSE_KIT' || needKind === 'PIPE_PATCH') {
        // consumed: delete item doc + remove from inventory
        invAfter = removeFromInventory(invAfter, itemId);
        itemDeletes.push(itemRef);
      } else if (needKind === 'TOOLKIT') {
        const curDur = nInt(item.durability, nInt(item.durabilityMax, 1));
        const nextDur = Math.max(0, curDur - 1);

        if (nextDur <= 0) {
          invAfter = removeFromInventory(invAfter, itemId);
          itemDeletes.push(itemRef);
        } else {
          itemWrites.push({ ref: itemRef, patch: { durability: nextDur } });
        }
      } else if (needKind === 'BATTERY') {
        // stackable: decrement quantity; delete if reaches 0
        const curQty = Math.max(0, nInt(item.quantity, 0));
        const nextQty = Math.max(0, curQty - 1);

        if (nextQty <= 0) {
          invAfter = removeFromInventory(invAfter, itemId);
          itemDeletes.push(itemRef);
        } else {
          itemWrites.push({ ref: itemRef, patch: { quantity: nextQty } });
        }
      }

      // Actor patch
      const actorMeta = metaPatchForSnap(actorInfo.snap);
      const actorPatch = {
        currentAp: nextAp,
        inventory: invAfter,
        ...actorMeta,
      };

      // Cell patch + meta
      const cellMeta = metaPatchForSnap(cSnap);
      const finalCellPatch = {
        ...cellPatch,
        cellId: String(cellId),
        ...cellMeta,
      };

      // District updates (objectives + utility flags) if this cell is a facility cell
      const districtId = cell.districtId != null ? String(cell.districtId) : null;

      let dsPatch = null;
      let objectiveTouched = null;
      let utilitiesTouched = false;

      if (districtId && districtId !== '0') {
        const dsRef = districtStateCol(gId).doc(String(districtId));
        const dsSnap = await tx.get(dsRef);

        if (dsSnap.exists) {
          const ds = dsSnap.data() || {};

          const powerCellId = ds.facilityCellIdPower || null;
          const waterCellId = ds.facilityCellIdWater || null;
          const ispCellId   = ds.facilityCellIdIsp || null;

          // Objective progress only when repairing the correct component on facility cell
          let dsNext = ds;
          let objectiveChanged = false;

          if (target === 'fuse') {
            if (powerCellId && String(powerCellId) === String(cellId)) {
              dsNext = applyObjectiveAction(dsNext, 'power', 'fuseKitActions');
              objectiveChanged = true;
              objectiveTouched = { which: 'power', actionKey: 'fuseKitActions' };
            }
            if (ispCellId && String(ispCellId) === String(cellId)) {
              dsNext = applyObjectiveAction(dsNext, 'isp', 'fuseKitActions');
              objectiveChanged = true;
              objectiveTouched = { which: 'isp', actionKey: 'fuseKitActions' };
            }
          }

          if (target === 'water') {
            if (waterCellId && String(waterCellId) === String(cellId)) {
              dsNext = applyObjectiveAction(dsNext, 'water', 'pipePatchActions');
              objectiveChanged = true;
              objectiveTouched = { which: 'water', actionKey: 'pipePatchActions' };
            }
          }

          // Refresh utility truth if we touched ANY facility cell (structure/fuse/water/generator)
          const touchedFacility =
            (powerCellId && String(powerCellId) === String(cellId)) ||
            (waterCellId && String(waterCellId) === String(cellId)) ||
            (ispCellId && String(ispCellId) === String(cellId));

          if (touchedFacility) {
            utilitiesTouched = true;

            // Read facility cells in-tx (and apply current patch to the touched one)
            const getFacilityCell = async (fid) => {
              if (!fid) return null;
              const ref = cellsCol(gId).doc(String(fid));
              const snap = await tx.get(ref);
              if (!snap.exists) return null;
              const data = snap.data() || {};
              if (String(fid) === String(cellId)) {
                // apply our new patch so utility computation sees the repaired state
                return applyCellPatchToData(data, cellPatch);
              }
              return data;
            };

            const powerCell = await getFacilityCell(powerCellId);
            const waterCell = await getFacilityCell(waterCellId);
            const ispCell   = await getFacilityCell(ispCellId);

            const powerOn = utilityOnFromFacilityCell({
              utilityKey: 'powerOn',
              facilityType: 'TRANSFORMER_SUBSTATION',
              facilityCell: powerCell,
            });

            const waterOn = utilityOnFromFacilityCell({
              utilityKey: 'waterOn',
              facilityType: 'WATER_PLANT',
              facilityCell: waterCell,
            });

            const ispOn = utilityOnFromFacilityCell({
              utilityKey: 'ispOn',
              facilityType: 'ISP',
              facilityCell: ispCell,
            });

            const dsMeta = metaPatchForSnap(dsSnap);

            dsPatch = {
              districtId: String(districtId),
              ...dsMeta,
            };

            if (objectiveChanged) {
              dsPatch.objectives = dsNext.objectives;
            }

            dsPatch.powerOn = !!powerOn;
            dsPatch.waterOn = !!waterOn;
            dsPatch.ispOn = !!ispOn;

            tx.set(dsRef, dsPatch, { merge: true });
          } else if (objectiveChanged) {
            // objective changed implies we were on a facility cell, but keep this safe
            const dsMeta = metaPatchForSnap(dsSnap);
            dsPatch = {
              districtId: String(districtId),
              objectives: dsNext.objectives,
              ...dsMeta,
            };
            tx.set(dsRef, dsPatch, { merge: true });
          }
        }
      }

      // Apply writes in same tx
      tx.set(actorInfo.ref, actorPatch, { merge: true });
      tx.set(cRef, finalCellPatch, { merge: true });

      for (const w of itemWrites) {
        const meta = metaPatchForSnap(w.ref ? await tx.get(w.ref) : null);
        tx.set(w.ref, { ...(w.patch || {}), ...meta }, { merge: true });
      }

      for (const ref of itemDeletes) {
        tx.delete(ref);
      }

      // Events (same tx)
      const ev = [];

      ev.push({
        type: 'ACTION',
        messageKey: 'repair_cell',
        actorId: aId,
        pos: actor.pos || null,
        args: {
          cellId: String(cellId),
          target,
          apCost,
          itemKind: needKind,
        },
      });

      if (objectiveTouched) {
        ev.push({
          type: 'ACTION',
          messageKey: 'objective_progress',
          actorId: aId,
          pos: actor.pos || null,
          args: {
            districtId: districtId || null,
            which: objectiveTouched.which,
            actionKey: objectiveTouched.actionKey,
          },
        });
      }

      if (utilitiesTouched && districtId) {
        ev.push({
          type: 'ACTION',
          messageKey: 'district_utilities_refresh',
          actorId: aId,
          pos: actor.pos || null,
          args: { districtId: String(districtId) },
        });
      }

      await eventsWriter.appendEventsTx(tx, { gameId: gId, events: ev });
    });

    // Return minimal success payload (detailed state is read via getCell/getDistrictState/events)
    return { ok: true };
  }

  return { repairCell };
};