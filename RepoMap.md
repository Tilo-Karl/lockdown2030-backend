# RepoMap

## Folder Tree (ld2030/v1 depth 3)

```
ld2030/v1
├── actions/
│   ├── ap-costs.js
│   ├── ap-service.js
│   ├── attack-entity.js
│   ├── barricade-door.js
│   ├── barricade-stairs.js
│   ├── climb-in.js
│   ├── climb-out.js
│   ├── debarricade-door.js
│   ├── debarricade-stairs.js
│   ├── enter-building.js
│   ├── equip-item.js
│   ├── events.js
│   ├── index.js
│   ├── move-player.js
│   ├── repair-cell.js
│   ├── repair-door.js
│   ├── repair-rules.js
│   ├── search.js
│   ├── secure-door.js
│   ├── stairs.js
│   ├── stand-up.js
│   ├── unequip-item.js
│   └── validators.js
├── combat/
│   └── combat.js
├── config/
│   ├── config-doors.js
│   ├── config-game.js
│   ├── config-names.js
│   ├── config-stairs.js
│   ├── config-tick.js
│   ├── config-tile.js
│   ├── index.js
│   ├── skills.js
│   └── zombie-forms.js
├── engine/
│   ├── handlers/
│   │   ├── climb-handlers.js
│   │   ├── door-handlers.js
│   │   ├── repair-handlers.js
│   │   ├── stair-handlers.js
│   │   └── stand-handlers.js
│   ├── action-router.js
│   ├── building-infra.js
│   ├── door-service.js
│   ├── encumbrance.js
│   ├── engine.js
│   ├── enter-exit-service.js
│   ├── equipment-rules.js
│   ├── equipment-service.js
│   ├── index.js
│   ├── integrity.js
│   ├── inventory-service.js
│   ├── move-rules.js
│   ├── search-rules.js
│   ├── stair-service.js
│   ├── state-reader.js
│   ├── state-writer-attack.js
│   ├── state-writer-core.js
│   ├── state-writer-equipment.js
│   ├── state-writer-events.js
│   ├── state-writer-inventory.js
│   ├── state-writer-repair.js
│   ├── state-writer-search.js
│   ├── state-writer-spawn.js
│   ├── state-writer.js
│   └── visibility.js
├── entity/
│   ├── humans/
│   │   └── human.js
│   ├── items/
│   │   ├── armor.js
│   │   ├── catalog.js
│   │   ├── item.js
│   │   ├── rules.js
│   │   └── weapon.js
│   ├── zombies/
│   │   └── zombie.js
│   ├── base-actor.js
│   ├── base-entity.js
│   ├── base-item.js
│   ├── entityRules
│   ├── index.js
│   ├── registry.js
│   └── resolver.js
├── events/
│   └── event-constants.js
├── loot/
│   └── loot-tables.js
├── npc/
│   └── zombie-config.js
├── tick/
│   ├── index.js
│   ├── tick-humans.js
│   ├── tick-player.js
│   ├── tick-zombies.js
│   ├── tickEngine.js
│   ├── zombie-doors.js
│   ├── zombie-stairs.js
│   └── zombie-utils.js
├── world/
│   ├── cells.js
│   ├── district-state.js
│   ├── edges.js
│   └── world-time.js
├── README_Curl
├── city-layout.js
├── init-game.js
├── join-game.js
├── map-buildings.js
├── map-gen.js
├── map-namegen.js
├── state-spawn.js
└── state.js
```

## Services

- `ld2030/v1/actions/ap-service.js` → `AP`, `apCostFor`, `ensureActorHasAp` → centralized AP cost table plus helper to enforce/pay AP in action handlers.
- `ld2030/v1/engine/door-service.js` → `makeDoorService` → loads + normalizes `edges/*` door docs, computes HP, and applies secure/barricade/repair patches while keeping edge IDs stable.
- `ld2030/v1/engine/stair-service.js` → `makeStairService` → normalizes stair edges between floors, computes barricade HP, and applies barricade/debarricade/damage logic before writes.
- `ld2030/v1/engine/enter-exit-service.js` → `makeEnterExitService` → enforces enter/exit door gates and moves actors (via the provided writer) between outside/inside positions.
- `ld2030/v1/engine/equipment-service.js` → `makeEquipmentService` → orchestrates equip/unequip by reading actors/items, running pure `equipment-rules`, recalculating derived stats, then calling `state-writer-equipment.*` transactionally.
- `ld2030/v1/engine/inventory-service.js` → `makeInventoryService` → orchestrates pickup/drop by loading actors/items, recomputing carry/derived stats, then calling `state-writer-inventory.*` to write actor + item docs atomically.

## Writers

- `ld2030/v1/engine/state-writer-core.js` → `movePlayer`, `updatePlayer`, `updateZombie`, `updateHuman`, `updateItem`, `updateActor`, `updateActorAndEdgeAtomic`, `updateCell`, `updateEdge`, `updateDoor`, `updateStairEdge`, `updateDistrictState`, `updateNoiseTile`, `writeGameMeta` → each function runs a Firestore transaction touching the corresponding collection (players, zombies, humans, items, cells, edges, districtState, noiseTiles) or the root `games/{gameId}` doc; `updateActorAndEdgeAtomic` writes one actor doc and one `edges/{edgeId}` document in the same tx so AP spend + door/stair changes stay atomic.
- `ld2030/v1/engine/state-writer-attack.js` → `attackEntity` → single transaction that re-reads attacker and target docs (players/zombies/humans/items), applies combat results, and appends events into `games/{gameId}/events` plus `eventMeta/feed` sequence bookkeeping.
- `ld2030/v1/engine/state-writer-spawn.js` → `spawnZombies`, `spawnHumans`, `spawnItems` → wipes and repopulates the `zombies`, `humans`, or `items` subcollections under `games/{gameId}` via batch write (delete existing docs, then insert new spawn docs with timestamps/pos).
- `ld2030/v1/engine/state-writer-equipment.js` → `equipItem`, `unequipItem` → per-actor transaction that re-validates inventory/equipment invariants and writes the merged patch back to the actor doc in `players/*` or `humans/*`.
- `ld2030/v1/engine/state-writer-inventory.js` → `pickupItem`, `dropItem` → transactionally updates the actor doc (players/humans) and the `items/{itemId}` doc (carriedBy/pos) while enforcing same-tile + not-equipped constraints.
- `ld2030/v1/engine/state-writer-search.js` → `searchCell` → transaction that deducts `currentAp` on `players/{uid}` and updates `cells/{cellId}.search` counters (remaining/max/searchedCount) with server timestamps.
- `ld2030/v1/engine/state-writer-events.js` → `appendEventsTx`, `appendEvents` → appends bounded entries to `games/{gameId}/events` and updates `eventMeta/feed` (keeps `MAX_KEEP` by deleting `e_{seq-MAX_KEEP}` inside the same tx).
- `ld2030/v1/engine/state-writer-repair.js` → `repairCell` → monolithic transaction touching `players/{uid}` (AP + inventory), `cells/{cellId}` (structure/components), `districtState/{districtId}` (objectives/utilities), related `items/*` docs (patch or delete), and the events feed; enforces facility objective progress plus utility refresh.

## Readers

- `ld2030/v1/engine/state-reader.js` → `getGame`, `getPlayer`, `getActor`, `getItem`, `getCell`, `getEdge`, `getDistrictState`, `listEvents`, `playersCol`, `zombiesCol`, `humansCol`, `itemsCol`, `cellsCol`, `edgesCol`, `districtStateCol`, `noiseTilesCol`, `readGridSize` → wraps Firestore reads for runtime world/actor/item collections and the event feed (with `DEFAULT_LIMIT`/`MAX_LIMIT` enforcement) and exposes collection references to the rest of the engine/tick code.

## Action endpoints

| Route file | Action router handler | Writer / service touched |
| --- | --- | --- |
| `move-player.js` | `actions.handleMove` → `engine.move` | `writer.updateActor` (state-writer-core) updates the player doc’s `pos` and AP after `reader.getCell` bounds checks. |
| `attack-entity.js` | `actions.handleAttackEntity` → `engine.attackEntity` | `writer.attackEntity` (state-writer-attack) updates attacker/target docs and appends combat events. |
| `equip-item.js` | `actions.handleEquipItem` → `engine.equipItem` | `makeEquipmentService.equipItem` reads via `state-reader`, recomputes derived stats, and calls `state-writer-equipment.equipItem`. |
| `unequip-item.js` | `actions.handleUnequipItem` → `engine.unequipItem` | `makeEquipmentService.unequipItem` delegates to `state-writer-equipment.unequipItem` after recomputing carry stats. |
| `search.js` | `actions.handleSearch` → `engine.search` | Engine calls `writer.searchSpot` (intended to be `state-writer-search.searchCell`) to update `players/{uid}` AP and `cells/{cellId}.search` counters. |
| `enter-building.js` | `actions.handleEnterBuilding` → `engine.enterBuilding` | Uses `doorService.loadDoorOrDefault` for gating and `writer.updateActor` to move the actor indoors with AP spend. |
| `stairs.js` | `actions.handleStairs` → `engine.stairs` | Checks `stairService.loadEdgeOrDefault` for barricades then calls `writer.updateActor` to bump `z`/AP. |
| `climb-in.js` | `actions.handleClimbIn` → `engine.climbHandlers.handleClimbIn` | `writer.updateActor` moves the actor inside while `ap-service.ensureActorHasAp` enforces cost. |
| `climb-out.js` | `actions.handleClimbOut` → `engine.climbHandlers.handleClimbOut` | Uses `doorService.loadDoorOrDefault`; `writer.updateActor` or `writer.updateActorAndEdgeAtomic` (if unsecuring a door) writes actor pos + door edge state. |
| `stand-up.js` | `actions.handleStandUp` → `engine.standHandlers.handleStandUp` | `writer.updateActor` clears prone/down flags and updates AP. |
| `secure-door.js` | `actions.handleSecureDoor` → `engine.doorHandlers.handleSecureDoor` | `doorService.applySecure` + `writer.updateActorAndEdgeAtomic` write AP + `edges/{edgeId}` door data. |
| `barricade-door.js` | `actions.handleBarricadeDoor` → `engine.doorHandlers.handleBarricadeDoor` | `doorService.applyBarricade` + `writer.updateActorAndEdgeAtomic` mutate barricade state. |
| `debarricade-door.js` | `actions.handleDebarricadeDoor` → `engine.doorHandlers.handleDebarricadeDoor` | `doorService.applyDebarricade` + `writer.updateActorAndEdgeAtomic`. |
| `repair-door.js` | `actions.handleRepairDoor` → `engine.doorHandlers.handleRepairDoor` | `doorService.applyRepair` + `writer.updateActorAndEdgeAtomic` restore destroyed doors. |
| `repair-cell.js` | `actions.handleRepairCell` → `engine.repairHandlers.handleRepairCell` | Delegates to `state-writer-repair.repairCell` which updates actor, cell, districtState, related items, and emits events. |
| `barricade-stairs.js` | `actions.handleBarricadeStairs` → `engine.stairHandlers.handleBarricadeStairs` | `stairService.applyBarricade` + `writer.updateActorAndEdgeAtomic` update stair edges. |
| `debarricade-stairs.js` | `actions.handleDebarricadeStairs` → `engine.stairHandlers.handleDebarricadeStairs` | `stairService.applyDebarricade` + `writer.updateActorAndEdgeAtomic`. |
| `events.js` (GET) | n/a (read-only) | Uses `reader.listEvents` with `DEFAULT_LIMIT`/paging to emit the bounded feed. |

## Shared helpers (used by 3+ modules)

- `ld2030/v1/actions/validators.js` → `nIntStrict`, `nInt`, `requireUid`, `requireGameId`, `requirePos`, `requireInside`, `requireOutside`, `requireDzPlusMinus1`, `sameTile`, `requireSameTile`, `cellIdFor` → reused by climb, door, stair, and other handlers for strict actor/tile validation.
- `ld2030/v1/actions/ap-costs.js` → `AP`, `apCostFor`, `moveCostFromCell` → referenced by `ap-service`, `stand-handlers`, `repair-rules`, and other action logic to stay on a single AP table.
- `ld2030/v1/events/event-constants.js` → `MAX_KEEP`, `DEFAULT_LIMIT`, `MAX_LIMIT`, `EVENT_TYPES`, `MESSAGE_KEYS` → shared across the event writer, reader, and attack writer for consistent feed sizing + combat message keys.
- `ld2030/v1/entity/index.js` → `resolveEntityConfig`, `resolveEntityConfigFlexible`, `ENTITY_CONFIG` accessors → used by spawn writers, equipment/inventory services, attack logic, and tick code to pull template defaults for actors/items.

## Ambiguities

- Root `index.js` does `require('./state')`, `./initGame`, and `./joinGame`, but only `ld2030/v1/state.js`, `ld2030/v1/init-game.js`, and `ld2030/v1/join-game.js` exist, so those imports currently point at missing files.
- `engine.search` calls `writer.searchSpot(...)`, while `state-writer-search.js` only exports `searchCell`; unless aliased elsewhere, this mismatch means search actions will throw because the writer method is undefined.
