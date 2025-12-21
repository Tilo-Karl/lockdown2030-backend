# Lockdown 2030 — Big Bang Touch Ledger (V1)

DO THE ABOVE RADIO STATION TO ISP CHANGE ALSO in WHATEVER PASS WE ARE ON that touches any file with radtio station in it. NOW SHUT THE FUCK UP ABOUT
    Right now the ledger says “add it if you don’t have it yet” — good — but make it explicit that this is mandatory for V1 district gameplay. its explicit, now shut the FUCK up.
    
**Rule:** We do **one sweep**. When we open a file, we apply **all** Big Bang contract changes relevant to that file **in the same edit session**.

**Inputs (authoritative):**
- `gamePlan/20_gameplay_contracts_v1.md`
- `gamePlan/40_big_bang_implementation_plan_v1.md`

**Output of this doc:** a strict “touch order” and, for each file, the **full bundle** of edits to do while you’re there.

---

## Ledger discipline (non‑negotiable)

1) **No feature sweeps.** No “radio rename sweep”, no “loot sweep”, no “tick sweep”. One pass.
2) **When a file is touched, do everything it needs:**
   - **RADIO_STATION → ISP** key alignment
   - tick/time fields
   - meters, AP costs, carry rules
   - runtime world collections
   - action routing
   - combat/repair/search
   - district objectives
   - any enums/switches in that file
3) **Stop rework by centralizing constants:**
   - time constants live in one module
   - AP costs live in one module
   - item rules live in one module
   - combat math lives in one module

## Touch Session Checklist (print this and follow it every time you open a file)

**Rule:** If you open a file during Big Bang, verify before you close it:
- [ ] Any `RADIO_STATION` references are converted to `ISP` if they represent the building type key.
- [ ] Any constants duplicated in-file are replaced with imports from the single source of truth (tick/AP/combat/items).
- [ ] Any response payload changes needed for visibility contract are added now (not later).

### A) Contract alignment checks (always)
- [ ] Anything in this file that touches gameplay must match `gamePlan/20_gameplay_contracts_v1.md`.
- [ ] If you introduce a new constant while editing, it must live in a single shared module (tick / AP costs / combat / item rules). Do not duplicate “magic numbers” in this file.

### B) Key alignment checks (always)
- [ ] If this file references a building type key, it must use **`ISP`** (not `RADIO_STATION`) wherever it means the building type.
- [ ] If this file reads/writes loot tables, ensure the loot table key matches the building type key exactly.
- [ ] If this file touches weapons/ammo, keep weapon `ammoType` as categories (e.g. `'9MM'|'SHELL'|'556'|'BOLT'`) and ensure ammo consumption uses the single mapping in `entity/items/rules.js` (do NOT hardcode kind strings in multiple places).

### C) Data-model drift checks (when relevant)
- [ ] If this file touches runtime world state, it must read/write **cells** (`games/{gameId}/cells/*`) and **edges** (`games/{gameId}/edges/*`) — not mapMeta.
- [ ] If this file touches district utilities, it must read/write **districtState** (`games/{gameId}/districtState/*`).

### D) Action + tick integration checks (when relevant)
- [ ] If this file touches actions: validate AP, validate DOWNED rules, enforce same-tile rule, apply AP costs from the central table.
- [ ] If this file touches tick: advance world time once, apply regen/meters, apply downed rules, then run zombie tick.

### E) Visibility payload checks (when relevant)
- [ ] All API responses are shaped through ONE response boundary: `ld2030/v1/engine/visibility.js`. Do not implement visibility rules ad-hoc in individual handlers.
- [ ] Responses must NOT leak exact HP unless the player is on the same cell (integrity labels otherwise).
- [ ] If you add new state fields, ensure the response includes enough for client to render integrity labels.

### F) End-of-edit sanity (always)
- [ ] Grep within this file for `RADIO_STATION` and fix any building-type-key uses to `ISP` (don’t rename strings that are intentionally historical).
- [ ] Confirm you didn’t accidentally add a second copy of a rule already defined elsewhere (link to the authoritative section instead).

---

## Touch order (Big Bang)

### Touch Group A — Foundation + config (touch once)

#### A1) `ld2030/v1/config/config-game.js`
**Bundle of edits to do in this file when you touch it:**
- **Building type key alignment**
  - Replace `RADIO_STATION` with `ISP` everywhere:
    - `MAP.BUILDING_TYPES`
    - `MAP.BUILDING_PALETTE`
    - any comments/strings that imply it’s “radio”
- **Player defaults (match gameplay contracts)**
  - Ensure defaults include any V1-required fields you decided to store on player doc at join/init, such as:
    - `carryCap` default (20)
    - starting meters (hunger/hydration/stress)
    - any downed flags you store
- **District required list**
  - If `REQUIRED_PER_DISTRICT` mentions `RADIO_STATION`, switch to `ISP`.

**Also do a quick grep while you’re here:** if any other config file references `RADIO_STATION`, fix it when you touch that file (do NOT open files just for this).

---

#### A2) `ld2030/v1/config/config-tick.js`
**Bundle:**
- Make tick constants match contracts:
  - `TICK_LEN_SECONDS = 300`
  - `TICKS_PER_DAY = 288`
  - `HUNGER_HYDRATION_DRAIN_EVERY_TICKS = 72` (6h)
  - `HYDRATION_REFRESH_EVERY_TICKS = 12` (+1 per 1h when inside + water available)
- Define AP/HP regen amounts + caps here *or* in a single imported module (but one source of truth).

---

#### A3) `ld2030/v1/config/config-tile.js` (only if it owns terrain/move costs)
**Bundle:**
- Ensure MOVE rules can compute:
  - base move cost
  - overweight move cost (2 AP)
  - blocking terrain flags

---

### Touch Group B — Core runtime world (create the new modules, then wire them)

#### B1) NEW `ld2030/v1/world/world-time.js`
**Create:**
- Functions:
  - `initWorldTime(gameDoc)` (sets tickIndex, tickLenSeconds, ticksPerDay)
  - `advanceTick(gameDoc)`
  - helpers: `isDay(tickIndex)`, `timeOfDay(tickIndex)` (placeholder)
- This is where the tick math lives. Nothing else re-derives constants.

---

#### B2) NEW `ld2030/v1/world/cells.js`
**Create:**
- Create/read/update helpers for `games/{gameId}/cells/*`
- Defaults for:
  - outside cells (terrain, blocksMove, moveCost)
  - inside cells (type, hp/maxHp, ruined, infra maps, search maps)
- Search state helpers:
  - `ensureSearch(cell)`
  - `decrementSearch(cell)`

---

#### B3) NEW `ld2030/v1/world/edges.js`
**Create:**
- Create/read/update helpers for `games/{gameId}/edges/*`
- Door + stairs edge schemas:
  - door: `hp/maxHp/isOpen/isSecured/barricadeLevel`
  - stairs: `hp/maxHp/barricadeLevel`

---

#### B4) NEW `ld2030/v1/world/district-state.js`
**Create:**
- `ensureDistrictState(gameId, districtId)`
- Facility mapping (contract):
  - `TRANSFORMER_SUBSTATION → powerOn`
  - `WATER_PLANT → waterOn` (if you don’t have this building type yet, add it in the generator/config during the same pass)
  - `ISP → ispOn`
- Facility selection rule (deterministic, V1):
  - During init-game, for each district and each facility type, choose the facility cell as:
    - the first inside cell at `z=0, layer=1` whose `cell.type` matches the facility building type.
  - Persist the chosen cell ids on districtState, e.g. `facilityCellIdPower`, `facilityCellIdWater`, `facilityCellIdIsp`.
  - All flip-off/restore checks read those ids (no scanning during tick).
- Flip OFF rule:
  - facility cell `ruined==true` OR `hp<=0` => utility OFF
- Restore loop counters/state representation (whatever you decide):
  - zombie-free gate
  - repair hp >= 50%
  - infra action counts: power=3 fuse kits, water=3 pipe patches, isp=2 fuse kits

---

#### B5) `ld2030/v1/init-game.js`
**Bundle (do everything, not just one feature):**
- Write worldTime into `games/{gameId}` using `world-time.js`
- Initialize runtime:
  - outside cells grid at z=0 layer=0
  - inside cells for building footprints for all floors z=0..floors-1 layer=1
  - edges (doors + stairs) created via `edges.js`
  - districtState docs created for all districts via `district-state.js`
- Ensure building type keys match config (`ISP`, not `RADIO_STATION`).

---

### Touch Group C — Tick engine (player regen, meters, zombies, district objective effects)

#### C1) `ld2030/v1/tick/*` (tick runner + tick modules)
**Bundle:**
- Tick clock:
  - read/write `games/{gameId}.tickIndex` via `world-time.js`
- Player regen:
  - AP/HP regen per tick with caps (as per contracts)
- Meters:
  - hunger/hydration drain every 72 ticks
  - hydration refresh +1 every 12 ticks if inside + water available
  - stress: set to max when hunger/hydration == 0 (no death)
- Downed:
  - if `hp<=0` set `isDowned=true`
  - regen still applies
  - **no auto-stand**
- Zombies:
  - priority order already locked (keep it)
  - barrier hits + infra hits integrated with the new runtime docs
- District objective flip:
  - if facility is ruined/hp<=0 => flip district OFF
  - if restored => flip ON

---

### Touch Group D — Action choke point + AP costs (all verbs)

#### D0) One-time “anchor discovery” (no edits, just a list)
**Goal:** avoid hunting mid-pass.
- Run a quick grep for the real entrypoints you will touch once:
  - routes/endpoints (join/move/attack/tick/search/repair)
  - the single engine choke point that routes actions today
  - the single place responses are serialized (or will be)
- Write the resulting file path list at the top of your working notes for the day.
**Rule:** after this 2-minute discovery, follow the ledger touch order and do not branch into feature sweeps.

#### D1) `ld2030/v1/engine/*` (whatever routes actions today)
**Bundle:**
- Single choke point:
  - validate AP
  - validate downed state
  - enforce “same-tile” rule
  - route to action handlers
- Ensure responses contain enough info for the visibility contract (integrity labels vs exact hp on same cell).

#### D1.5) NEW `ld2030/v1/engine/visibility.js`
**Create (single response boundary):**
- `shapeForViewer({ viewerActor, payload, viewerCellId })`:
  - strips exact HP fields unless viewer is on the same cell/edge per contract
  - emits integrity labels instead
- All endpoints must call this once before returning JSON.

#### D2) `ld2030/v1/actions/*` (MOVE/SEARCH/ATTACK/REPAIR/BARRICADE/SECURE/STAND_UP)
**Bundle:**
- MOVE:
  - overweight => 2 AP
- SEARCH:
  - 1 roll
  - remaining--
  - stop at 0
  - use loot tables by building type
- ATTACK:
  - PvP OFF
  - ammo usage for ranged
  - durability loss
  - stress affects hit chance
- REPAIR:
  - toolkit-only until repaired hp reaches ~50% of maxHp
  - after threshold: consume toolkit durability + required part
- BARRICADE/DEBARRICADE/SECURE:
  - anyone can debarricade
- STAND_UP:
  - 10 AP → set hp to 10
  - only when player is online/active (no server auto-stand)

---

#### D3) NEW `ld2030/v1/actions/ap-costs.js`
**Create:** single AP cost table used by all actions.

#### D4) NEW `ld2030/v1/actions/validators.js`
**Create:** common validation helpers (AP, downed, overweight, same-tile).

#### D5) NEW `ld2030/v1/actions/repair-rules.js`
**Create:** the “~50% maxHp threshold” logic in one place.

---

### Touch Group E — Loot + item catalog completeness

#### E1) `ld2030/v1/loot/loot-tables.js`
**Bundle:**
- Ensure keys match `config-game.js` exactly:
  - table key becomes `ISP` (not `RADIO_STATION`)
- Keep alias mapping if you use promotions (APARTMENT/HOTEL/UNIVERSITY/CLINIC/HOSPITAL).

---

#### E2) `ld2030/v1/entity/items/catalog.js`
**Bundle:**
- Must export every kind referenced by loot tables and actions.

#### E3) `ld2030/v1/entity/items/item.js`
**Bundle:**
- Add missing consumables/parts/ammo/doses referenced by loot tables:
  - WATER_BOTTLE, SODA_CAN, CANNED_FOOD, MRE
  - BANDAGE, ANTISEPTIC, PAINKILLER, STIM
  - FUSE_KIT, PIPE_PATCH
  - AMMO_9MM, AMMO_SHELL, AMMO_556
  - GHOST_DOSE, FOCUS_DOSE, FURY_DOSE (if referenced)
- Ensure each has `description` (long use text), not just `name`.

#### E4) `ld2030/v1/entity/items/weapon.js`
**Bundle:**
- Keep `ammoType` as a **category** string (do NOT rename): `'9MM' | 'SHELL' | '556' | 'BOLT'`.
- Ensure ranged weapons use the correct category.
- Ammo consumption must map `ammoType -> ammo item kind` via `entity/items/rules.js` (single source of truth).

#### E5) `ld2030/v1/entity/items/armor.js`
**Bundle:**
- Ensure armor values align with the flat mitigation model.

#### E6) NEW `ld2030/v1/entity/items/rules.js`
**Create:**
- stacking rules
- ammo packaging units
- `ammoTypeToKind` mapping:
  - `'9MM' -> 'AMMO_9MM'`
  - `'SHELL' -> 'AMMO_SHELL'`
  - `'556' -> 'AMMO_556'`
  - `'BOLT' -> 'AMMO_BOLT'` (even if you don’t spawn it yet)

- durability triggers
- dropped item expiry rule (288 ticks)

#### E7) `ld2030/v1/entity/base-item.js`
**Bundle:**
- If you store flags (stackable, ammoPackSize, etc.), centralize them or reference `items/rules.js`.

---

### Touch Group F — Combat math centralization

#### F1) NEW `ld2030/v1/combat/combat.js`
**Create:**
- hit chance formula
- dodge from Athletics
- stress penalty
- damage variance
- armor flat mitigation
- barrier dodge=0
- no crits

#### F2) `ld2030/v1/entityRules` (and/or wherever you compute damage today)
**Bundle:**
- Replace any duplicated combat math with calls into `combat.js`.

---

### Touch Group G — District objectives + chat gating

#### G1) `ld2030/v1/world/district-state.js` (revisit once)
**Bundle:**
- Wire facility damage/repair events into district flips.

#### G2) Chat endpoints (wherever they are)
**Bundle:**
- Global chat always ON
- District chat + DMs require `ispOn` for sender district

---

### Touch Group H — Map generator alignment (only once, as part of Big Bang)

#### H1) `ld2030/v1/city-layout.js`
#### H2) `ld2030/v1/map-gen.js`
#### H3) `ld2030/v1/map-buildings.js`
#### H4) `ld2030/v1/state-spawn.js`
**Bundle for each of these generator/spawn files when touched:**
- Replace building type key `RADIO_STATION` with `ISP`.
- Ensure any placement logic and “special buildings” lists include `ISP`.
- Ensure floors promotion logic still works (APARTMENT/HOTEL/UNIVERSITY/CLINIC/HOSPITAL).
- If you introduce `WATER_PLANT` as a facility building type, add it consistently here and in config.

---

## Files you probably do NOT touch in Big Bang (unless the compiler forces you)
- `ld2030/v1/map-namegen.js` (names only)
- `ld2030/v1/config/config-names.js` (flavor)
- `ld2030/v1/README_Curl` (docs)
- `ld2030/v1/npc/*` (until NPCs are real)

---

## “Opened file” checklist (print this at the top of your TODO while coding)
When you open any file during Big Bang, verify before you close it:
- [ ] Any `RADIO_STATION` references are converted to `ISP` if they represent the building type key.
- [ ] Any constants duplicated in-file are replaced with imports from the single source of truth (tick/AP/combat/items).
- [ ] Any response payload changes needed for visibility contract are added now (not later).
