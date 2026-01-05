# Runtime World Model (Firestore) — Cells, Edges, Districts, Noise

## Principle (locked)
- `mapMeta` is blueprint only (static).
- Runtime gameplay state lives in:
  - `cells/` (per-cell state)
  - `edges/` (door + stairs barriers so state never drifts)
  - `districtState/` (district-wide utility switches)
  - `noiseTiles/` (noise/groan map)

## Max-values policy (locked)
- Firestore stores **mutable runtime truth only** (`hp`, `remaining`, flags, etc.).
- **Max/base values are derived from server config (`WORLD`)**:
  - `cell.maxHp`, `cell.search.maxRemaining`, component maxes
  - door **base HP** and any door **max HP** used for UI math
- Max/base values **do not need to exist in Firestore**.
- If any docs contain max/base fields (legacy/debug), they are **non-authoritative** and must not be used as gameplay truth.
- Server responses may include derived max/base values for UI math (integrity labels, percentages), but they are not runtime state.

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
  - door + stairs barriers live here (hp + open/secured where relevant)
  - prevents outside/inside drift and duplicated barrier state

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
- `createdAt`, `updatedAt`

Outside-only (layer=0):
- `terrain` (string)
- `blocksMove` (bool)
- `moveCost` (int)

Inside-only (layer=1):
- `type` (string) — building type (HOUSE/BAR/etc), drives loot/search table
- `districtId` (string|null) — for district utilities mapping (recommended)

Shared runtime state (mutable truth only):
- `hp` (int)
- `ruined` (bool)

Inside-only runtime components (mutable truth only):
- `fuse` { `hp` }
- `water` { `hp` }
- `generator` { `installed` (bool), `hp` }
- `search` { `remaining`, `searchedCount` }

Derived (NOT required in Firestore; may be returned in responses):
- `maxHp`
- `fuse.maxHp`
- `water.maxHp`
- `generator.maxHp`
- `search.maxRemaining`

Notes (locked):
- Outside terrain also exists as cells (at minimum z=0, layer=0).
- Indoor cells exist for building footprint tiles across floors (z=0..floors-1, layer=1).
- Doors/stairs are never stored on cells; they live on edges.
- Persisting derived max/base values for convenience/debug is allowed, but they remain **non-authoritative**.

---

## Edges schema (locked v1)

Doc id: `e_{a...}__{b...}`

Fields (runtime truth):
- `edgeId` (string)
- Endpoints:
  - A: `{x,y,z,layer}`
  - B: `{x,y,z,layer}`
- `kind`: `"door"` | `"stairs"`
- **Door durability fields**
  - `structureHp` / `structureMaxHp` — physical door health (independent of barricades). Door is passable iff `isOpen === true` OR `structureHp === 0`.
  - `barricadeLevel`, `barricadeHp`, `barricadeMaxHp` — barricade durability (only exists when level > 0).
    - Barricade damage never touches structure until `barricadeHp` hits 0.
    - Destroyed doors (structureHp === 0) must auto-clear barricade state.

- **Stairs durability fields**
  - No structure HP. Only barricade fields exist: `barricadeLevel`, `barricadeHp`, `barricadeMaxHp`.
  - `barricadeHp === 0` (or level 0) means passable stairs.
  - Barricades can be added/removed per level; HP is clamped between 0..barricadeMaxHp.

Door-only fields (runtime truth):
- `isOpen` (bool)
- `isSecured` (bool)
  - Locked rule: a door cannot be secured if it is open. Must close first.

Notes (locked):
- “Broken/damaged/etc” are **integrity labels**, not stored truth.
- If you see stored `maxHp`, `baseHp`, `barricadeLevel`, etc. from old versions, treat as **non-authoritative**.

---

## Barrier rules (locked)
- Same-tile interactions only (same `(x,y,z,layer)` when relevant).
- Doors block outside→inside enter if `isOpen=false AND hp>0`.
- Doors pass if `isOpen=true OR hp<=0`.
- Stairs block floor change if `hp>0` (meaning: stairs barricade exists).

---

## Integrity labels (shared UI rule, locked)
At 100%: no label. Otherwise show ONE (using derived base/max where needed):

- Door: `hp <= 0` → door destroyed
- Stairs: `hp <= 0` → barricade removed (not “destroyed stairs”)
- `0 < hp/maxHp <= 0.33` → almost destroyed
- `0.33 < hp/maxHp <= 0.66` → broken
- `0.66 < hp/maxHp < 1.0` → damaged

Notes:
- `maxHp` here is derived from server config (or returned by server), not required in Firestore.
- Door labeling can use derived `baseDoorHp`:
  - if `hp > baseDoorHp` ⇒ door is “barricaded” (extra HP above base)
  - if `hp <= baseDoorHp` ⇒ plain door
- Secured requires closed (`isOpen=false`).

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
- Gameplay name and config key is **ISP**.

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
