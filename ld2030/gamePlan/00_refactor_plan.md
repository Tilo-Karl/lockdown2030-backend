What went wrong (in one line)

writeDoorEdges() silently became “needs baseDoorHp injected”, but init-game.js didn’t inject it → runtime failure. That’s a module contract mismatch, not a “door bug”.

So the systematic fix is: make contracts visible and enforceable.

The systematic approach (top + bottom, not middle)

Phase 1 — Repo-wide contract audit (Codex does the dirty work)

Goal: generate a single report that lists:
	•	every module’s public exports
	•	every module’s config dependencies (what constants it expects)
	•	every “boundary” contract: init → world/*, actions → engine, engine → writers/services, tick → reader/writer
	•	mismatches like “function requires param X but caller never passes it”

One Codex prompt (copy/paste):

Create AUDIT_CONTRACTS.md at repo root.
Scan all JS files under ld2030/v1/** and produce:
	1.	Public API inventory: for each module, list module.exports keys (or exported functions) and their parameter names.
	2.	Config dependency map: for each module, list which config objects it imports from ld2030/v1/config (e.g. DOOR/GRID/TICK/WORLD) and which specific keys it uses (e.g. DOOR.BASE_HP).
	3.	Callsite mismatch list: find functions that require a parameter (e.g. baseDoorHp) where there exists a callsite that doesn’t pass it; list file+line for both sides.
	4.	Runtime truth boundaries: identify which modules write Firestore (writers/world init) and which ones must remain pure (rules/config/entity).
Output only the markdown file. Do not edit any existing code.

This is “start from the top/bottom”: it maps config + Firestore boundaries first, across everything.

Phase 2 — Architecture plan (I do the senior brain work)

Once you paste AUDIT_CONTRACTS.md here, I’ll give you a single refactor plan that:
	•	fixes the worst contract hotspots first (init/world, services/writers)
	•	defines 2–4 shared helpers (tx helpers + patch helpers) that eliminate duplication everywhere
	•	tells Codex exactly which files to touch in each refactor step (small controlled batches)

Phase 3 — Codex executes refactor in small batches

Not “rewrite the repo”, but “batch 1: tx helpers”, “batch 2: migrate 2 writers”, “batch 3: migrate door/stair services”, etc.

And about “paste whole files”

Do it. If you want me to review something without waiting for the audit, paste whole files and I’ll extract the interfaces myself.

But if you want systematic, the audit doc is the fastest way to stop random drift like DOOR/baseDoorHp.

If you run that prompt and paste back AUDIT_CONTRACTS.md, I’ll turn it into the clean restructure plan (top-down + bottom-up) and we’ll stop playing whack-a-mole.