# Runtime World Model (Firestore) — Cells, Edges, Districts, Noise

## Principle (locked)
- `mapMeta` is blueprint only (static).
- Runtime gameplay state lives in:
  - `cells/` (per-cell state)
  - `edges/` (door + stairs barriers so state never drifts)
  - `districtState/` (district-wide utility switches)
  - `noiseTiles/` (noise/groan map)

---

## Collections (locked)

### World blueprint (static)
- `games/{gameId}.mapMeta`
  - terrain, building footprints, floor counts, district assignment logic, etc.
  - written at init, not used as a mutable state store

### Cells (runtime truth)
- `games/{gameId}/cells/c_{x}_{y}_{z}_{layer}`
  - layer: `0 = outside`, `1 = inside`
  - holds hp/ruin/infra/search/terrain/type

### Edges (runtime truth)
- `games/{gameId}/edges/e_{ax}_{ay}_{az}_{al}__{bx}_{by}_{bz}_{bl}`
  - doors and stairs live here (hp, barricade, open/closed, etc.)
  - prevents outside/inside drift and duplicated door state

### District state (runtime truth)
- `games/{gameId}/districtState/{districtId}`
  - `powerOn`, `waterOn`, `ispOn`

### Noise (runtime truth)
- `games/{gameId}/noiseTiles/n_{x}_{y}_{z}`
  - aggregated noise intensity per tile (not per layer)

---

## Cells schema (locked v1)

Doc id: `c_{x}_{y}_{z}_{layer}`

Common fields:
- `cellId` (string)
- `x` (int), `y` (int), `z` (int)
- `layer` (int: 0 outside, 1 inside)

Outside-only (layer=0):
- `terrain` (string)
- `blocksMove` (bool)
- `moveCost` (int)

Inside-only (layer=1):
- `type` (string) — building type (HOUSE/BAR/etc), drives loot/search table

Shared runtime state:
- `hp` (int), `maxHp` (int)
- `ruined` (bool)
- `fuse` { `hp`, `maxHp` }
- `water` { `hp`, `maxHp` }
- `generator` { `installed` (bool), `hp`, `maxHp` }
- `search` { `remaining`, `maxRemaining`, `searchedCount` }
- `createdAt`, `updatedAt`

Notes (locked):
- Outside terrain also exists as cells (at minimum z=0, layer=0).
- Indoor cells exist for building footprint tiles across floors (z=0..floors-1, layer=1).
- Doors/stairs are never stored on cells; they live on edges.

---

## Edges schema (locked v1)

Doc id: `e_{a...}__{b...}`  
Fields:
- `edgeId` (string)
- Endpoints:
  - A: `{x,y,z,layer}`
  - B: `{x,y,z,layer}`
- `kind`: `"door"` | `"stairs"`
- `hp`, `maxHp`
- Door-only:
  - `isOpen` (bool)
  - `isSecured` (bool)
  - `barricadeLevel` (int)
- Stairs-only:
  - `barricadeLevel` (int) (or equivalent block value)

---

## Barrier rules (locked)
- Same-tile interactions only.
- Doors block outside→inside enter if `isOpen=false AND hp>0`.
- Doors pass if `isOpen=true OR hp<=0`.
- Stairs block floor change if `hp>0` (or barricade blocks) on the stairs edge.

---

## Integrity labels (shared UI rule, locked)
At 100%: no label.
Otherwise show ONE:
- `hp <= 0` → destroyed
- `0 < hp/maxHp <= 0.33` → almost destroyed
- `0.33 < hp/maxHp <= 0.66` → broken
- `0.66 < hp/maxHp < 1.0` → damaged

State labels separate: open/closed where relevant.

---

## District-wide utilities (locked V1)

districtState doc:
- `powerOn` (bool)
- `waterOn` (bool)
- `ispOn` (bool) — ISP/phone+text availability (NOT a noise source)

Availability rules:
- Power available on a cell if:
  - (`district.powerOn` AND `cell.fuse.hp > 0`) OR (`cell.generator.installed` AND `cell.generator.hp > 0`)
- Water available on a cell if:
  - (`district.waterOn` AND `cell.water.hp > 0`)
- ISP available on a cell if:
  - (`district.ispOn` AND cell has power)

ISP naming (locked):
- Gameplay name is **ISP**
- Config/building key may remain `RADIO_STATION` if needed for compatibility, but the *concept* is ISP.

---

## NoiseTiles (locked design)
Doc id: `n_{x}_{y}_{z}`  
Fields:
- `x,y,z`
- `level` (int)
- `kind` ("groan" | "door_hit" | "stairs_hit" | "gunshot" | "combat" | "search" | ...)
- `sourceId`, `sourceType`
- `updatedAt`, `decaysAt`

Tick behavior:
- Writes add to `level` (clamp), extend `decaysAt`.
- Decay per tick (exact decay math can be tuned later; concept is locked).