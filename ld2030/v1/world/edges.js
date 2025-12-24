// ld2030/v1/world/edges.js
// Runtime edges helpers + init writers (V1).
//
// POLICY (locked):
// - Runtime edges store mutable runtime truth only.
// - Max/base values are derived from server config (not persisted as max/base fields).
// - Doors + stairs both use ONE barrier pool: edge.hp.
//   - Door edge.hp = door barrier HP pool (door itself + any added barricade).
//   - Stairs edge.hp = stairs barricade HP (NOT the stairs).
// - Doors/stairs use e_* ids.
// - Doors cannot be secured while open (enforced by services; init sets safe defaults).

function normEndpoint(p) {
  return {
    x: Number(p.x),
    y: Number(p.y),
    z: Number(p.z),
    layer: Number(p.layer),
  };
}

function endpointKey(p) {
  return `${p.x}_${p.y}_${p.z}_${p.layer}`;
}

function edgeIdFor(a, b) {
  const A = normEndpoint(a);
  const B = normEndpoint(b);
  const ka = endpointKey(A);
  const kb = endpointKey(B);
  const left = ka <= kb ? A : B;
  const right = ka <= kb ? B : A;
  return `e_${endpointKey(left)}__${endpointKey(right)}`;
}

function iterBuildingTiles(building) {
  if (!building) return [];

  if (Array.isArray(building.tiles) && building.tiles.length) {
    return building.tiles
      .map((t) => ({ x: Number(t.x), y: Number(t.y) }))
      .filter((t) => Number.isFinite(t.x) && Number.isFinite(t.y));
  }

  if (Array.isArray(building.footprint) && building.footprint.length) {
    return building.footprint
      .map((t) => ({ x: Number(t.x), y: Number(t.y) }))
      .filter((t) => Number.isFinite(t.x) && Number.isFinite(t.y));
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

async function writeDoorEdges({ db, admin, edgesCol, mapMeta, baseDoorHp }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();
  const buildings = Array.isArray(mapMeta?.buildings) ? mapMeta.buildings : [];

  const baseHp = Number(baseDoorHp);
  if (!Number.isFinite(baseHp) || baseHp <= 0) {
    throw new Error(`writeDoorEdges: baseDoorHp must be a finite number > 0 (got: ${baseDoorHp})`);
  }

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

  for (const b of buildings) {
    const tiles = iterBuildingTiles(b);
    for (const t of tiles) {
      const outside = { x: t.x, y: t.y, z: 0, layer: 0 };
      const inside = { x: t.x, y: t.y, z: 0, layer: 1 };
      const id = edgeIdFor(outside, inside);
      const ref = edgesCol.doc(id);

      batch.set(
        ref,
        {
          edgeId: id,
          a: outside,
          b: inside,
          kind: "door",

          // Optional denorm for fast queries/debug (not gameplay truth).
          x: t.x,
          y: t.y,

          outsideCellId: `c_${t.x}_${t.y}_0_0`,
          insideCellId: `c_${t.x}_${t.y}_0_1`,

          // Door state (runtime truth)
          isOpen: false,
          isSecured: false,

          // Single barrier pool (runtime truth)
          hp: baseHp,

          createdAt: serverTs(),
          updatedAt: serverTs(),
        },
        { merge: true }
      );

      ops++;
      written++;
      await commitIfFull();
    }
  }

  if (ops > 0) await batch.commit();
  return { written };
}

async function writeStairsEdges({ db, admin, edgesCol, mapMeta }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();
  const buildings = Array.isArray(mapMeta?.buildings) ? mapMeta.buildings : [];

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

  for (const b of buildings) {
    const tiles = iterBuildingTiles(b);
    const floors = Number.isFinite(b.floors) ? Math.max(1, Math.floor(b.floors)) : 1;
    if (floors <= 1) continue;

    for (let z = 0; z < floors - 1; z++) {
      for (const t of tiles) {
        const a = { x: t.x, y: t.y, z, layer: 1 };
        const bb = { x: t.x, y: t.y, z: z + 1, layer: 1 };
        const id = edgeIdFor(a, bb);
        const ref = edgesCol.doc(id);

        batch.set(
          ref,
          {
            edgeId: id,
            a,
            b: bb,
            kind: "stairs",

            // Optional denorm for debug (not gameplay truth).
            x: t.x,
            y: t.y,
            zLo: z,
            zHi: z + 1,

            // Single barrier pool for stairs barricade:
            // hp==0 means "no barricade installed" (passable).
            hp: 0,

            createdAt: serverTs(),
            updatedAt: serverTs(),
          },
          { merge: true }
        );

        ops++;
        written++;
        await commitIfFull();
      }
    }
  }

  if (ops > 0) await batch.commit();
  return { written };
}

module.exports = {
  edgeIdFor,
  writeDoorEdges,
  writeStairsEdges,
};