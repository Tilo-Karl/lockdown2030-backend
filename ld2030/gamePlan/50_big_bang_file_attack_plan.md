# Lockdown 2030 — Big Bang File Attack Plan (V1) — REORDERED BY COHESION (UPDATED)

Everything marked ✅ is **FROZEN** (do not reopen unless compiler forces).

---

## ✅ Completed (FROZEN)

### Group A — Foundation + Config ✅ DONE
- [x] A1 `ld2030/v1/config/config-game.js`
- [x] A2 `ld2030/v1/config/config-tick.js`
- [x] A3 `ld2030/v1/config/config-tile.js`

### Group B — Core Runtime World ✅ DONE
- [x] B1 `ld2030/v1/world/world-time.js`
- [x] B2 `ld2030/v1/world/cells.js`
- [x] B3 `ld2030/v1/world/edges.js`
- [x] B4 `ld2030/v1/world/district-state.js` ✅ (facility binding + objectives scaffolding + applyObjectiveAction + utilityOnFromFacilityCell)
- [x] B5 `ld2030/v1/init-game.js`

### Group B.6 — IO Surface Freeze ✅ DONE
- [x] `ld2030/v1/state.js`
- [x] `ld2030/v1/engine/state-reader.js`
- [x] writer surface (core/search/equipment/etc.)
- [x] `ld2030/v1/join-game.js`

### Group B.7 — World Services Freeze (Gate C) ✅ DONE
- [x] door/stairs/enter-exit/infra services read+write runtime truth
- [x] endpoints route through services

### Group D — Action choke point + AP costs (Gate D) ✅ DONE
- [x] engine/router choke point
- [x] actions verbs wired
- [x] AP costs + validators centralized

### ✅ Group D.1 — Inside-cell Repair (Gate D Extension) ✅ DONE (FROZEN)
- [x] repair rules + ruined-clearing on structure repair
- [x] REPAIR_CELL tx writer (actor+cell+item+districtState+events)
- [x] wiring: handlers/engine/router/state-writer/actions endpoints

### Group E — Loot + item catalog completeness ✅ DONE
- [x] loot tables ISP key
- [x] item catalog + rules

### Group F + C — Combat + Events feed + Tick damage alignment ✅ DONE (FROZEN)
- [x] combat + bounded events feed + attack emits events + tick damage aligned

### ✅ Group G1 — District objective progress wiring ✅ DONE (FROZEN)
- [x] facility-only objective increments + utility refresh + events (via REPAIR_CELL writer)

### ✅ Group G2 — Chat endpoints ✅ DONE (FROZEN)
- [x] global chat (always)
- [x] district chat (gated by `ispOn`)
- [x] DM chat (gated by `ispOn`)
- [x] bounded seq log + paging (events-style)

### ✅ Group H — Map generator alignment ✅ DONE (FROZEN)
- [x] H1 `ld2030/v1/city-layout.js` (per-district facility picks: power + water + isp)
- [x] H2 `ld2030/v1/map-gen.js` (force facility building types per district; stop emitting RADIO_STATION)
- [x] H3 `ld2030/v1/map-buildings.js` (normalize legacy RADIO_STATION → ISP)
- [x] H4 `ld2030/v1/state-spawn.js` (N/A to facilities; spawn logic depends on tileMeta only)

---

## 🔜 Remaining work

## Frontend + integration cleanup (not part of Big Bang backend plan)
- iOS UI wiring (chat + events + district state display)
- any final “repo starts / entrypoint import” cleanup whenever you feel like it