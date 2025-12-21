# Lockdown 2030 — Master Plan (single source of truth)

This doc set is the source of truth. If it’s not written here, it’s not real.

## Current Phase
**Phase:** 2 (Infra + Barriers + Skills scaffolding)  
**Backend status:** ✅ doors + stairs barricades + zombie tick interaction working  
**Direction:** BIG BANG (full implementation; no slice demos)

## Locked Rules (do not debate later)
- **Same-tile rule:** attacks/interactions happen only on the same tile (no adjacency hits).
- **Zombie priority on a cell (locked):**
  1) Attack player (same cell, matching layer)
  2) Attack blocking barrier edge reachable from this cell (door edge for enter; stairs edge for floor change)
  3) If barrier not blocking: enter / change floor
  4) If installed infra exists and you want “they hate power/water”: hit installed thing next (future)
  5) If nothing else: move/wander
- **Door passability (locked):**
  - A door is passable **only** if it is open OR destroyed (hp <= 0).
  - “Broken” is an **integrity label**, not passable. Broken doors still block.
  - Zombie outside→inside enter: if isOpen → enter; else if hp<=0 → enter; else blocked (attack door on same tile).
- **Player skills (locked):**
  - R1–R3 general (anyone can buy)
  - Class unlock = hit R3 in the 2 prereq skills
  - After class lock: class prereq skills can go R4+
  - Neutral skills can go to R6 for any class

## “We’re clear” checklist
- Human classes: Bruiser / Gunslinger / Scavenger / Warden / Medic
- Prereqs: 2 skills @ R3 (no “2 of 3” system)
- Neutral skills: Athletics + Brawling can go R6 for anyone
- Zombie forms: Walker / Runner / Brute / Smart

## Where rules live (single authoritative sections)
- **Time + Tick + Survival + Stress + Combat + Progression + Death + Items + Multiplayer:** see `20_gameplay_contracts_v1.md`
- **Runtime data model (cells/edges/districtState/noise):** see `10_world_model_runtime.md`
- **Skills + zombie forms + noise map design:** see `30_skills_zombies_noise.md`

## Open TODO (ordered, CONCEPT + CONTRACT only)
1) **Finder modifier (LOCK):** pick exactly one:
   - +1 extra roll, OR
   - reroll junk once
2) **Door repair v2 (policy):** repair restores hp even if not destroyed (already desired; implement later)
3) **Infection / player-zombies:** keep as future (do NOT fork systems); add only when needed
4) **Endgame “Rescue Event” details:** placeholder exists; trigger window rules can be filled later

(Everything else below is already locked as V1 contracts in the other files.)