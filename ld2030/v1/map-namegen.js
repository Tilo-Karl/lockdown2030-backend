// ld2030/v1/map-namegen.js
// Deterministic name generator for mapMeta (city + districts + buildings).
// No Firestore, pure functions.

const { NAMES } = require('./config/config-names');

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed, w, h) {
  // stable-ish integer seed from inputs
  const s = Number(seed) || 0;
  const W = Number(w) || 0;
  const H = Number(h) || 0;
  // mix
  return (s ^ (W * 73856093) ^ (H * 19349663)) >>> 0;
}

function pick(rng, arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(rng() * arr.length)];
}

function pickUnique(rng, arr, used) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  for (let i = 0; i < 50; i++) {
    const v = pick(rng, arr);
    if (v && !used.has(v)) {
      used.add(v);
      return v;
    }
  }
  // fallback: allow reuse if list is exhausted
  return pick(rng, arr);
}

function makeDistrictNames({ rng, cityName, count }) {
  const used = new Set([cityName]);
  const names = [];

  for (let i = 0; i < count; i++) {
    const base = pickUnique(rng, NAMES.PLACE, used) || cityName;
    const suffix = pick(rng, NAMES.DISTRICT_SUFFIX) || 'District';

    // 50/50: either “Base Suffix” or “Suffix of Base”
    const style = rng() < 0.5
      ? `${base} ${suffix}`
      : `${suffix} ${pick(rng, NAMES.CONNECTOR) || 'of'} ${base}`;

    names.push(style);
  }

  return names;
}

function buildingNameForType({ rng, cityName, districtName, type }) {
  const label = NAMES.TYPE_LABEL[type] || type;

  // Civic buildings: “<District> <Label>”
  const civic = new Set([
    'HOSPITAL', 'CLINIC', 'PHARMACY', 'POLICE', 'FIRE_STATION', 'SCHOOL',
    'LABORATORY', 'RADIO_STATION', 'HQ', 'TRANSFORMER_SUBSTATION',
  ]);
  if (civic.has(type)) {
    const base = (rng() < 0.6) ? districtName : cityName;
    return `${base} ${label}`;
  }

  // Shops: “<Person>'s <ShopWord>” / “<Place> <ShopWord>” / “<Place> <CompanyWord>”
  if (type === 'SHOP') {
    const style = rng();
    if (style < 0.45) {
      const p = pick(rng, NAMES.PEOPLE) || 'Someone';
      const w = pick(rng, NAMES.SHOP_WORD) || 'Shop';
      return `${p}'s ${w}`;
    }
    if (style < 0.8) {
      const base = (rng() < 0.6) ? districtName : cityName;
      const w = pick(rng, NAMES.SHOP_WORD) || 'Shop';
      return `${base} ${w}`;
    }
    const base = (rng() < 0.6) ? districtName : cityName;
    const c = pick(rng, NAMES.COMPANY_WORD) || 'Co.';
    return `${base} ${c}`;
  }

  // Restaurants: “<Person>'s <Label>” / “<District> <Label>”
  if (type === 'RESTAURANT') {
    if (rng() < 0.55) {
      const p = pick(rng, NAMES.PEOPLE) || 'Someone';
      return `${p}'s ${label}`;
    }
    return `${districtName} ${label}`;
  }

  // Everything else: “<District> <Label>” or “<City> <Label>”
  const base = (rng() < 0.6) ? districtName : cityName;
  return `${base} ${label}`;
}

function ensureUniqueName(name, usedNames) {
  if (!name) name = 'Unknown';
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }
  // add suffix
  let n = 2;
  while (usedNames.has(`${name} ${n}`)) n++;
  const out = `${name} ${n}`;
  usedNames.add(out);
  return out;
}

/**
 * Mutates mapMeta:
 * - mapMeta.cityName
 * - mapMeta.districts = { count, names: [...] }
 * - mapMeta.buildings[].name
 */
function applyNamesToMapMeta({ mapMeta, seed, w, h, districtCount }) {
  if (!mapMeta) throw new Error('applyNamesToMapMeta: missing_mapMeta');

  const rng = mulberry32(hashSeed(seed, w, h));

  const cityName = pick(rng, NAMES.PLACE) || 'Lockdown City';
  const districts = makeDistrictNames({ rng, cityName, count: districtCount || 1 });

  mapMeta.cityName = cityName;
  mapMeta.districts = {
    count: districtCount || 1,
    names: districts,
  };

  const buildings = Array.isArray(mapMeta.buildings) ? mapMeta.buildings : [];
  const usedNames = new Set();

  for (const b of buildings) {
    const dId = Number.isFinite(b.districtId) ? b.districtId : 0;
    const districtName = districts[dId] || districts[0] || cityName;
    const raw = buildingNameForType({
      rng,
      cityName,
      districtName,
      type: String(b.type || '').toUpperCase(),
    });
    b.name = ensureUniqueName(raw, usedNames);
  }

  return mapMeta;
}

module.exports = {
  applyNamesToMapMeta,
};