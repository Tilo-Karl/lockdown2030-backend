// ld2030/v1/engine/building-infra.js
// Building infra rules operating on runtime truth ONLY:
// - cells/* for structure + components (fuse/water/generator/search)
// - districtState/* for district utilities + facility bindings
//
// Master-plan intent for V1:
// - Structure hp/ruin lives on inside cells (layer=1)
// - Components live on inside cells: fuse.hp, water.hp, generator.{installed,hp}
// - Utilities availability uses districtState flags + component hp (no mapMeta scans)

const { derivedInsideMaxes, ensureSearch } = require('../world/cells');

function nInt(x, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? Math.trunc(v) : fallback;
}

function nBool(x) {
  return x === true;
}

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}

function isInsideCell(cell) {
  return cell && nInt(cell.layer, -1) === 1;
}

function normalizeInsideCell(cell) {
  if (!cell || typeof cell !== 'object') throw new Error('CELL: missing');
  if (!isInsideCell(cell)) throw new Error('CELL: not_inside');

  const type = cell.type != null ? String(cell.type) : null;
  const mx = derivedInsideMaxes(type);

  const out = { ...cell };

  // Structural
  out.hp = Number.isFinite(out.hp) ? nInt(out.hp, mx.maxHp) : mx.maxHp;
  out.hp = clamp(out.hp, 0, mx.maxHp);
  out.ruined = nBool(out.ruined) || out.hp <= 0;

  // Components
  const fuse = out.fuse && typeof out.fuse === 'object' ? out.fuse : {};
  const water = out.water && typeof out.water === 'object' ? out.water : {};
  const generator = out.generator && typeof out.generator === 'object' ? out.generator : {};

  out.fuse = { hp: clamp(nInt(fuse.hp, mx.fuseMax), 0, mx.fuseMax) };
  out.water = { hp: clamp(nInt(water.hp, mx.waterMax), 0, mx.waterMax) };

  out.generator = {
    installed: generator.installed === true ? true : mx.generatorInstalledDefault === true,
    hp: clamp(nInt(generator.hp, mx.generatorMax), 0, mx.generatorMax),
  };

  // Search state (max is derived; do not persist maxRemaining)
  out.search = ensureSearch(out);

  return out;
}

function pickCellUpdater(writer) {
  if (!writer || typeof writer.updateCell !== 'function') {
    throw new Error('BUILDING_INFRA: missing_writer.updateCell');
  }
  return writer.updateCell.bind(writer);
}

function pickDistrictUpdater(writer) {
  if (!writer || typeof writer.updateDistrictState !== 'function') {
    throw new Error('BUILDING_INFRA: missing_writer.updateDistrictState');
  }
  return writer.updateDistrictState.bind(writer);
}

function makeBuildingInfra({ reader, writer } = {}) {
  if (!reader) throw new Error('BUILDING_INFRA: missing_reader');

  const updateCell = pickCellUpdater(writer);
  const updateDistrictState = pickDistrictUpdater(writer);

  async function getCell(gameId, cellId) {
    if (!gameId || !cellId) throw new Error('CELL: missing_ids');
    if (typeof reader.getCell !== 'function') throw new Error('BUILDING_INFRA: reader.getCell missing');
    const cell = await reader.getCell(gameId, cellId);
    if (!cell) throw new Error('CELL: not_found');
    return cell;
  }

  async function getDistrictState(gameId, districtId) {
    if (!districtId) return null;
    if (typeof reader.getDistrictState !== 'function') {
      throw new Error('BUILDING_INFRA: reader.getDistrictState missing');
    }
    return await reader.getDistrictState(gameId, districtId);
  }

  function utilitiesForCell({ cell, districtState }) {
    // Runtime truth only: districtState flags + this tile's components + ruin.
    if (!cell) return { power: false, water: false, isp: false };
    if (!isInsideCell(cell)) return { power: false, water: false, isp: false };

    const c = normalizeInsideCell(cell);
    if (c.ruined === true) return { power: false, water: false, isp: false };

    const ds = districtState && typeof districtState === 'object' ? districtState : {};

    const districtPowerOn = ds.powerOn === true;
    const districtWaterOn = ds.waterOn === true;
    const districtIspOn = ds.ispOn === true;

    const fuseOk = nInt(c.fuse?.hp, 0) > 0;
    const waterOk = nInt(c.water?.hp, 0) > 0;

    const genInstalled = c.generator?.installed === true;
    const genOk = nInt(c.generator?.hp, 0) > 0;

    // V1:
    // power = (district power + fuse) OR (generator installed + generator hp)
    // isp = district ispOn AND power
    const power = (districtPowerOn && fuseOk) || (genInstalled && genOk);
    const water = districtWaterOn && waterOk;
    const isp = districtIspOn && power;

    return { power, water, isp };
  }

  async function applyStructuralDamage({ gameId, cellId, dmg }) {
    const raw = await getCell(gameId, cellId);
    const cell = normalizeInsideCell(raw);

    const type = cell.type != null ? String(cell.type) : null;
    const mx = derivedInsideMaxes(type);

    const damage = Math.max(0, nInt(dmg, 0));
    if (damage <= 0) return { ok: true, cell };

    const nextHp = Math.max(0, nInt(cell.hp, mx.maxHp) - damage);
    const ruined = nextHp <= 0 ? true : nBool(cell.ruined);

    const patch = {
      hp: nextHp,
      ruined,
    };

    // If ruined, you may also want to hard-zero components (keeps invariants simple).
    if (ruined) {
      patch.fuse = { hp: 0 };
      patch.water = { hp: 0 };
      patch.generator = { installed: cell.generator?.installed === true, hp: 0 };
      patch.search = { remaining: 0, searchedCount: nInt(cell.search?.searchedCount, 0) };
    }

    await updateCell(gameId, cellId, patch);

    // Facility linkage: if this cell is the district facility cell, flip district flag OFF.
    const districtId = cell.districtId != null ? String(cell.districtId) : null;
    const ds = await getDistrictState(gameId, districtId);

    if (ds && ruined) {
      const dsPatch = {};

      if (ds.facilityCellIdPower && String(ds.facilityCellIdPower) === String(cellId)) dsPatch.powerOn = false;
      if (ds.facilityCellIdWater && String(ds.facilityCellIdWater) === String(cellId)) dsPatch.waterOn = false;
      if (ds.facilityCellIdIsp && String(ds.facilityCellIdIsp) === String(cellId)) dsPatch.ispOn = false;

      if (Object.keys(dsPatch).length) {
        await updateDistrictState(gameId, districtId, dsPatch);
      }
    }

    return { ok: true, patchApplied: patch };
  }

  async function setComponentHp({ gameId, cellId, component, hp }) {
    const raw = await getCell(gameId, cellId);
    const cell = normalizeInsideCell(raw);

    const type = cell.type != null ? String(cell.type) : null;
    const mx = derivedInsideMaxes(type);

    const c = String(component || '');
    if (!['fuse', 'water', 'generator'].includes(c)) throw new Error('COMPONENT: unknown');

    const nextHp = Math.max(0, nInt(hp, 0));

    if (c === 'fuse') {
      await updateCell(gameId, cellId, { fuse: { hp: clamp(nextHp, 0, mx.fuseMax) } });
      return { ok: true };
    }

    if (c === 'water') {
      await updateCell(gameId, cellId, { water: { hp: clamp(nextHp, 0, mx.waterMax) } });
      return { ok: true };
    }

    // generator
    await updateCell(gameId, cellId, {
      generator: {
        installed: cell.generator?.installed === true,
        hp: clamp(nextHp, 0, mx.generatorMax),
      },
    });
    return { ok: true };
  }

  return {
    normalizeInsideCell,
    utilitiesForCell,
    applyStructuralDamage,
    setComponentHp,
  };
}

module.exports = { makeBuildingInfra };