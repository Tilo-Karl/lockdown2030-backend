Purpose

This document defines the final runtime architecture for Lockdown2030.

It does not redesign gameplay mechanics.
All existing mechanics (movement legality, combat, barricades, search, repair, damage, AP, ticks, AI behavior) are assumed correct and must be preserved.

The goal is to re-architect execution flow, not mechanics.

The only gameplay-level change allowed here is the promotion of movement from implicit 2D deltas to explicit 4D coordinates.

⸻

Core Principles (Locked)
	1.	Single Runtime Truth
	•	Cells and edges already contain the full world truth.
	•	No system may infer gameplay rules from frontend state.
	2.	Entity-Generic Actions
	•	Players, zombies, humans, AI, and tick logic all use the same action pipeline.
	•	No direct Firestore writes from gameplay code.
	3.	Action-Driven World
	•	Every state mutation happens via resolved actions.
	•	Writers are implementation details, never called directly by gameplay logic.
	4.	Concept Preservation
	•	Existing mechanics (search, barricades, repair, combat, damage, AP, diagonal movement) are reused as-is.
	•	Codex must not redesign, simplify, or restate them.

⸻

Movement (Mk2 – REPLACEMENT)

Movement is the only mechanic whose interface is changed.

What changes
	•	Movement is expressed as explicit target coordinates instead of deltas.
	•	The backend becomes fully authoritative over movement resolution.

New MOVE Action (Locked)

MOVE represents any positional change in the world.
	•	Horizontal movement
	•	Entering buildings
	•	Exiting buildings
	•	Stairs up / down
	•	Any future vertical orCTower-like transitions

There are no separate ENTER / EXIT / STAIRS actions anymore.

MOVE Input Contract

MOVE always receives:
	•	entityId
	•	to: { x, y, z, layer }

No dx/dy anywhere in the system.

What MOVE does not redefine

MOVE must reuse:
	•	Existing adjacency / diagonal movement logic
	•	Existing AP, blocking, damage, cading, search, repair logic
	•	Existing edge semantics (doors, stairs, barricades)

Codex must lift existing logic into the MOVE resolver, not rewrite it.

Edge Resolution
	•	All transitions between cells are resolved through edges
	•	Doors, stairs, barricades already model transitions and constraints
	•	MOVE queries edges between current cell and target cell
	•	No implicit semantics based on z or layer

⸻

Action Resolution Architecture

Unified Action Resolver

All actions flow through:
	•	Single action router
	•	Single resolver per action type
	•	Shared validation + resolution pipeline

There is no player-only logic.

Applies To
	•	Player input
	•	Zombie AI
	•	Human AI
	•	Tick engine updates
	•	Scripted events

If something moves, searches, attacks, barricades, or repairs — it emits an action.

⸻

Tick Engine Refactor

Tick code must:
	•	Stop mutating Firestore directly
	•	Stop calling writers directly
	•	Emit actions instead (MOVE, ATTACK, SEARCH, etc.)

Tick logic decides intent, not execution.

⸻

Writers (Internal Only)
	•	Writers remain responsible for persistence
	•	Writers are only called by action resolvers
	•	No gameplay code may call writers directly

⸻

HTTP / Frontend Contract

Frontend responsibilities are reduced to:
	•	Emitting intents (actions)
	•	Rendering authoritative state

Frontend must:
	•	Stop checking legality
	•	Stop inferring transitions
	•	Stop assuming semantics

⸻

What Is Explicitly Out of Scope

This document does not redefine:
	•	Diagonal movement math
	•	AP costs
	•	Damage formulas
	•	Search limits
	•	Barricade mechanics
	•	Repair rules
	•	Combat resolution

Those already exist and are correct.

⸻

Deletions (Intentional)

The following concepts are removed by replacement, not omission:
	•	dx/dy movement
	•	Player-only move endpoints
	•	ENTER / EXIT / STAIRS as separate actions
	•	Direct Firestore mutation from ticks or AI

⸻

Final Note (Non-Negotiable)

Codex must treat existing mechanics as locked primitives.

This plan is about architectural unification, not gameplay invention.

The only new semantic surface area is:
	•	MOVE as explicit 4D target resolution

Everything else is refactoring, not redesign.