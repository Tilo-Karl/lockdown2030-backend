Lockdown 2030 — Map Generation Rules (V1 Spec)

This document is the single source of truth for how map-gen and city-layout must behave.

1. Goals

1.1 Visual + gameplay
	•	Outside map should look like many small lots with readable names (Quarantine 2019 vibe) — not giant same-type blobs.
	•	Districts must exist and be readable: each district has key buildings + randomized filler.
	•	Road clumps are forbidden (see Road Rules).
	•	Nature should be chunkier: rivers/lakes/forests as big shapes, not noise-speckle.

1.2 Runtime data
	•	Runtime truth is cells/edges. mapMeta is blueprint only.
	•	Outside (layer=0) gets optional building stamp:
	•	building: { type, floors, districtId, name, root{ x,y } }
	•	Inside (layer=1) exists for each footprint tile and each floor z:
	•	(x,y,z,layer=1) for z = 0..floors-1

⸻

2. Districts

2.1 District partition
	•	Map is partitioned into N districts (deterministic from seed).
	•	Each district has:
	•	districtId
	•	generated district name
	•	a district center (for zoning/facilities)
	•	zone weights: RES / COM / IND / CIV

2.2 Mandatory key buildings (per district)

Each district must place these (as buildings, not tiles):
	•	Power: TRANSFORMER_SUBSTATION
	•	Water: WATER_PLANT
	•	Comms: ISP

     - no, don't need security or medical per district. but at least one each must exist per map and no more than 1 police per district.
	•	Security: POLICE or OUTPOST (seed/theme)
	•	Medical: CLINIC (some districts upgrade to HOSPITAL)

Optional (seeded):
	•	FIRE_STATION, SCHOOL, PHARMACY, GAS_STATION, SAFEHOUSE, BUNKER, HQ

	•	LABORATORY is rare (can be global-unique if desired) - rare is fine for now.

2.3 Filler buildings

After keys are placed, fill remaining lots by zone pools:
	•	RES: mostly HOUSE, some PARKING
	•	COM: SHOP, RESTAURANT, BAR, OFFICE
	•	IND: WAREHOUSE, PARKING, some OFFICE
	•	CIV: mixed civic pool (school/pharmacy/etc.)

⸻

3. Roads (hard rules)

3.1 Representation

Road = one terrain code (numeric or char, doesn’t matter) - we have the codes already, done make new ones.

3.2 Road rules (must always pass)
	1.	No diagonal road adjacency

	•	If (x,y) is road, then (x±1,y±1) must not be road.

	2.	No 2×2 road blocks

	•	For any (x,y), it must not be true that all are road:
	•	(x,y) (x+1,y) (x,y+1) (x+1,y+1)
(Usually implied by rule #1, but keep as explicit validator.)

	3.	Orthogonal connections only

	•	Roads connect N/E/S/W only.

	4.	Width = 1 tile

	•	Never generate 2-wide roads.

3.3 Generation approach (recommended)
	•	Make 2–4 arterials crossing the map edge-to-edge (orthogonal steps).
	•	Add branches as side streets.
	•	Every time you want to place a road tile, reject placements that violate rule #1.

3.4 Post-validation pass
	•	Validate all rules.
	•	If violations exist: remove minimal offending tiles, then repair connectivity.

⸻

4. Nature

4.1 Big features preferred
	•	1–2 rivers: continuous orthogonal path from one edge to another.
	•	Lakes: widen river in a few segments.
	•	Forests: generate then smooth into large patches.

4.2 Buildable land - what buildable? no, we are not a building sim and building buildings. we have type BUILD which can have buildings on them, which we have defined. the player won't be building buildings on empty space, there won't be any empty space, its either terrain or a building.

Buildable = not water, not blocked forest, not cemetery (if non-buildable), etc.

⸻

5. Blocks → lots → buildings (fixing “blob buildings”)

5.1 Blocks

A “block” is a connected buildable region bounded by roads (or map edge).

5.2 Lots (what you actually want)

Subdivide each block into lots:
	•	Most lots: 1×1, 1×2, 2×1, 2×2
	•	Some lots: 2×3, 3×2, 3×3
	•	Hard cap for normal lots: <= 9 tiles footprint
	•	Lots never overlap roads/nature.

5.3 Buildings
	•	Normal building footprint = the lot footprint.
	•	This prevents “every stamped tile is ISP” feeling like one mega-building.

⸻

6. Campuses (Quarantine-style multi-building groups)

6.1 Definition

A campus is multiple separate buildings sharing one group name.
Example: Denver Asylum = 3 buildings, each with floors.

6.2 Rules
	•	Rare: 0–2 campuses per district.
	•	Campus consumes multiple adjacent lots (2–6).
	•	Each lot becomes a sub-building, but shares:
	•	building.name = campus name
	•	building.root = campus anchor
	•	districtId
	•	Sub-buildings can have different floors.

This gives variety without giant blobs.

⸻

7. Floors

7.1 Floors are inside-only

Outside doesn’t “show floors”. Floors exist as inside cells (layer=1, z=0..floors-1).

7.2 Floor assignment (seeded + type-aware)

Suggested defaults:
	•	HOUSE: 1–2
	•	SHOP/BAR/RESTAURANT: 1–2
	•	OFFICE/HOTEL/HOSPITAL: 2–6
	•	Special facilities: 1–4
	•	Campus buildings: can skew higher (still bounded)

7.3 Inside creation requirement

For every footprint tile:
	•	write inside cells for every z floor.

⸻

8. Naming

8.1 District names
	•	Each district has a stable seeded name.

8.2 Building names
	•	Every building gets building.name (or campus group name).
	•	Normal buildings: type-themed namegen.
	•	Campus: shared name across the sub-buildings.

⸻

9. Acceptance tests (must pass)

9.1 Roads
	•	No diagonal road adjacency anywhere.
	•	No 2×2 road blocks.
	•	Roads width is 1 tile.
	•	At least one arterial crosses the map.

9.2 District keys
	•	Every district has all mandatory key buildings placed on buildable land.

9.3 Lot sanity
	•	Normal building footprints <= 9 tiles.
	•	Only campuses span multiple buildings (still small footprints per building).

9.4 Runtime cell population
	•	Outside cells count = w*h
	•	Inside cells count > 0 if any building exists
	•	Outside stamps exist for every building footprint tile
	•	Inside cells exist for every footprint tile and every floor

⸻

10. Tunables (config knobs)
	•	DISTRICTS.countForGrid(w,h)
	•	ROADS.ARTERIAL_COUNT
	•	ROADS.BRANCH_DENSITY
	•	LOTS.SIZE_DISTRIBUTION
	•	BUILDINGS.CAMPUS_RATE_PER_DISTRICT
	•	BUILDINGS.FLOORS_BY_TYPE
	•	NATURE.RIVER_COUNT
	•	NATURE.FOREST_COVERAGE

⸻

11. Non-goals (V1)
	•	Perfect realism / city-planner sim
	•	Traffic simulation
	•	Decorative micro-tiles
	•	Storing buildingId on cells (root is grouping key)