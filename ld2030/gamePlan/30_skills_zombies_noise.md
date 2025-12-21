# Skills, Classes, Zombie Forms, Noise Map (design + contracts)

---

## 1) Human skill system (locked rules)
Core rule:
- Skills are ranked.
- R1–R3 are “general tier” (anyone can buy them).
- Class unlock happens when you hit R3 in the 2 prereq skills for that class.
- After class is locked, only that class’s prereq skills can go R4+.
- Neutral skills can go to R6 for any class.

Classes + prereqs (2 skills @ R3):
- Bruiser: Melee, Dead Calm
- Gunslinger: Firearms, Dead Calm
- Scavenger: Finder, Sneaky Bastard
- Warden: Fixer, Melee
- Medic: First Aid, Dope Doc

Locked skill names

Class-prereq skills (cap R6 only after class lock):
- Melee
- Firearms
- Dead Calm
- Fixer
- Finder
- Sneaky Bastard
- First Aid
- Dope Doc

Neutral skills (cap R6 for anyone):
- Athletics
- Brawling

What skills do (initial knobs):
- AP costs: rank reduces AP cost for relevant actions
- Noise: Sneaky Bastard reduces noise for non-gun actions
- Stress: Dead Calm reduces effective stress level
- Finder: modifies search results (exact modifier still TODO in overview)
- Dope Doc: enables/weights drug pool and ladder unlocks

---

## 2) Dope Doc ladder (class-tier content)
R1: Ghost Dose — reduces noise output for a short window (or detection chance later)
R2: Focus Dose — improves hit chance (pairs with combat contract)
R3: Fury Dose — boosts melee/unarmed damage
R4: Adrenal Shot — +1 AP (rare)
R5: Stunner — short stun/slow on a zombie (later)
R6: Revive / Anti-turn — only if/when infection exists

---

## 3) Zombie forms (locked)
- Walker (baseline)
- Runner (fast + stairs-happy)
- Brute (smashes barriers hard)
- Smart (best at noise map bias + coordination)

Zombie skill philosophy (locked):
- Do not rewrite tick logic.
- Zombie “skills” are modifiers (numbers/weights) that adjust:
  - attraction to noise
  - move bias
  - barrier damage
  - stairs/climb chance
  - coordination (Smart only)

---

## 4) Noise / Groan Map (Firestore)
Goal:
- Players can see why zombies drift: where noise is, strength, decay.

Collections under `games/{gameId}/`:

A) Aggregated noise (main)
- `noiseTiles/n_{x}_{y}_{z}`

Fields:
- x,y,z
- level
- kind ("groan" | "door_hit" | "stairs_hit" | "gunshot" | "combat" | "search" | ...)
- sourceId/sourceType
- updatedAt
- decaysAt
- (optional) round

Tick behavior:
- Writing noise adds to level (clamp), updates kind/source, extends decaysAt.
- Each tick: decay down (exact decay curve tunable later).

Noise sources (first pass):
- Player actions: SEARCH, BARRICADE, REPAIR, combat, gunshots (big)
- Zombie actions: groan when player present, door/stairs hits

Zombie usage (first pass):
- Smart: strong bias toward highest noise tiles in radius
- Others: weak bias; mostly wander