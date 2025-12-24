// districtState init + facility selection persistence (V1).

const FACILITY_TYPES = {
  power: 'TRANSFORMER_SUBSTATION',
  water: 'WATER_PLANT',
  isp: 'ISP',
};

// Contract-fixed action counts (V1)
const FACILITY_ACTIONS = {
  power: { fuseKitActions: 3 },
  water: { pipePatchActions: 3 },
  isp:   { fuseKitActions: 2 },
};

function listDistrictIds(mapMeta) {
  const d = mapMeta?.districts;

  if (Array.isArray(d)) {
    return d
      .map(x => (x?.id ?? x?.districtId ?? x))
      .filter(x => x != null)
      .map(String);
  }

  if (d && typeof d === 'object') {
    return Object.keys(d).map(String);
  }

  const buildings = Array.isArray(mapMeta?.buildings) ? mapMeta.buildings : [];
  const set = new Set();
  for (const b of buildings) {
    if (b?.districtId != null) set.add(String(b.districtId));
  }
  return Array.from(set);
}

function iterBuildingTiles(building) {
  if (!building) return [];

  if (Array.isArray(building.tiles) && building.tiles.length) {
    return building.tiles
      .map(t => ({ x: Number(t.x), y: Number(t.y) }))
      .filter(t => Number.isFinite(t.x) && Number.isFinite(t.y));
  }

  if (Array.isArray(building.footprint) && building.footprint.length) {
    return building.footprint
      .map(t => ({ x: Number(t.x), y: Number(t.y) }))
      .filter(t => Number.isFinite(t.x) && Number.isFinite(t.y));
  }

  const x0 = Number(building.x);
  const y0 = Number(building.y);
  const w = Number(building.w);
  const h = Number(building.h);
  if ([x0, y0, w, h].every(Number.isFinite) && w > 0 && h > 0) {
    const out = [];
    for (let yy = y0; yy < y0 + h; yy++) {
      for (let xx = x0; xx < x0 + w; xx++) out.push({ x: xx, y: yy });
    }
    return out;
  }

  return [];
}

function pickFacilityCellId({ mapMeta, districtId, facilityType, cellIdFor }) {
  const buildings = Array.isArray(mapMeta?.buildings) ? mapMeta.buildings : [];
  for (const b of buildings) {
    const bDistrict = (b?.districtId != null) ? String(b.districtId) : null;
    if (bDistrict !== String(districtId)) continue;

    const type = (b?.type != null) ? String(b.type) : null;
    if (type !== facilityType) continue;

    const tiles = iterBuildingTiles(b);
    if (!tiles.length) continue;

    const t = tiles[0];
    return cellIdFor(t.x, t.y, 0, 1);
  }
  return null;
}

async function writeDistrictStates({ db, admin, districtStateCol, mapMeta, cellIdFor }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  const districtIds = listDistrictIds(mapMeta);
  let batch = db.batch();
  let ops = 0;
  let written = 0;

  async function commitIfFull() {
    if (ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  for (const id of districtIds) {
    const facilityCellIdPower = pickFacilityCellId({
      mapMeta,
      districtId: id,
      facilityType: FACILITY_TYPES.power,
      cellIdFor,
    });

    const facilityCellIdWater = pickFacilityCellId({
      mapMeta,
      districtId: id,
      facilityType: FACILITY_TYPES.water,
      cellIdFor,
    });

    const facilityCellIdIsp = pickFacilityCellId({
      mapMeta,
      districtId: id,
      facilityType: FACILITY_TYPES.isp,
      cellIdFor,
    });

    const ref = districtStateCol.doc(String(id));
    batch.set(
      ref,
      {
        districtId: String(id),

        // Start ON (tick/repair system will flip as needed)
        powerOn: true,
        waterOn: true,
        ispOn: true,

        // Deterministic facility binding (no scanning during tick)
        facilityCellIdPower: facilityCellIdPower || null,
        facilityCellIdWater: facilityCellIdWater || null,
        facilityCellIdIsp: facilityCellIdIsp || null,

        // Mandatory V1 restore-loop scaffolding (contract fixed counts)
        objectives: {
          power: {
            facilityType: FACILITY_TYPES.power,
            required: { ...FACILITY_ACTIONS.power },
            progress: { fuseKitActionsDone: 0 },
          },
          water: {
            facilityType: FACILITY_TYPES.water,
            required: { ...FACILITY_ACTIONS.water },
            progress: { pipePatchActionsDone: 0 },
          },
          isp: {
            facilityType: FACILITY_TYPES.isp,
            required: { ...FACILITY_ACTIONS.isp },
            progress: { fuseKitActionsDone: 0 },
          },
        },

        createdAt: serverTs(),
        updatedAt: serverTs(),
      },
      { merge: true }
    );

    ops++;
    written++;
    await commitIfFull();
  }

  if (ops > 0) await batch.commit();
  return { written };
}

// Add to ld2030/v1/world/district-state.js (below your init writer exports)

const { WORLD } = require('../config/config-game');

function isCellRuinedOrDead(cell, _maxHpIgnored) {
  if (!cell) return true;
  if (cell.ruined === true) return true;

  const hp = Number.isFinite(cell.hp) ? Number(cell.hp) : 0;
  return hp <= 0;
}

function derivedFacilityMaxes(facilityType) {
  // Uses same inside max logic (facilities are inside layer=1 cells)
  const maxHp = WORLD?.CELLS?.INSIDE?.maxHpForBuildingType
    ? WORLD.CELLS.INSIDE.maxHpForBuildingType(facilityType)
    : (WORLD?.CELLS?.INSIDE?.HP_MAX_DEFAULT ?? 50);

  const comp = WORLD?.CELLS?.INSIDE?.COMPONENT_MAX || {};
  return {
    maxHp: Number.isFinite(maxHp) ? Number(maxHp) : 50,
    fuseMax: Number.isFinite(comp.fuseHp) ? Number(comp.fuseHp) : 10,
    waterMax: Number.isFinite(comp.waterHp) ? Number(comp.waterHp) : 10,
  };
}

// Contract: ruined or hp<=0 => utility OFF.
// ALSO: facility-specific component hp<=0 => OFF.
function utilityOnFromFacilityCell({ utilityKey, facilityType, facilityCell }) {
  if (!facilityCell) return false;

  const mx = derivedFacilityMaxes(facilityType);
  if (facilityCell.ruined === true) return false;

  const hp = Number.isFinite(facilityCell.hp) ? Number(facilityCell.hp) : 0;
  if (hp <= 0) return false;

  if (utilityKey === 'powerOn' || utilityKey === 'ispOn') {
    const fhp = Number.isFinite(facilityCell?.fuse?.hp) ? Number(facilityCell.fuse.hp) : 0;
    return fhp > 0;
  }

  if (utilityKey === 'waterOn') {
    const whp = Number.isFinite(facilityCell?.water?.hp) ? Number(facilityCell.water.hp) : 0;
    return whp > 0;
  }

  return true;
}

// Restore loop progression (V1): increment counters, complete when >= required.
// (This does NOT magically repair the facility cell; your REPAIR action should do that.
// This ONLY progresses objective state, and district flips ON only if facility is currently healthy.)
function applyObjectiveAction(districtState, which, actionKey) {
  const ds = districtState && typeof districtState === 'object' ? districtState : {};
  const obj = ds.objectives && typeof ds.objectives === 'object' ? ds.objectives : {};
  const cur = obj[which] && typeof obj[which] === 'object' ? obj[which] : null;
  if (!cur) throw new Error(`DISTRICT_OBJECTIVE: missing_${which}`);

  const required = cur.required || {};
  const progress = cur.progress || {};

  const req = Number(required[actionKey] || 0);
  if (req <= 0) throw new Error(`DISTRICT_OBJECTIVE: invalid_action_${actionKey}`);

  const doneKey =
    actionKey === 'fuseKitActions' ? 'fuseKitActionsDone' :
    actionKey === 'pipePatchActions' ? 'pipePatchActionsDone' :
    `${actionKey}Done`;

  const done = Number.isFinite(progress[doneKey]) ? Number(progress[doneKey]) : 0;
  const nextDone = Math.min(req, done + 1);

  const next = {
    ...ds,
    objectives: {
      ...obj,
      [which]: {
        ...cur,
        progress: { ...progress, [doneKey]: nextDone },
      },
    },
  };

  return next;
}

// Reads facility cells and writes powerOn/waterOn/ispOn truth.
// Call this from tick (district flip step) OR after repair/objective actions.
async function refreshDistrictUtilities({ reader, writer, gameId, districtId }) {
  const ds = await reader.getDistrictState(gameId, districtId);
  if (!ds) throw new Error('DISTRICT_STATE: not_found');

  const powerCellId = ds.facilityCellIdPower || null;
  const waterCellId = ds.facilityCellIdWater || null;
  const ispCellId = ds.facilityCellIdIsp || null;

  const powerCell = powerCellId ? await reader.getCell(gameId, powerCellId) : null;
  const waterCell = waterCellId ? await reader.getCell(gameId, waterCellId) : null;
  const ispCell = ispCellId ? await reader.getCell(gameId, ispCellId) : null;

  const next = {
    powerOn: utilityOnFromFacilityCell({ utilityKey: 'powerOn', facilityType: 'TRANSFORMER_SUBSTATION', facilityCell: powerCell }),
    waterOn: utilityOnFromFacilityCell({ utilityKey: 'waterOn', facilityType: 'WATER_PLANT', facilityCell: waterCell }),
    ispOn: utilityOnFromFacilityCell({ utilityKey: 'ispOn', facilityType: 'ISP', facilityCell: ispCell }),
  };

  await writer.updateDistrictState(gameId, districtId, next);
  return { ok: true, districtId, ...next };
}

module.exports = {
  FACILITY_TYPES,
  FACILITY_ACTIONS,
  listDistrictIds,
  writeDistrictStates,
  applyObjectiveAction,
  refreshDistrictUtilities,
  utilityOnFromFacilityCell,
};