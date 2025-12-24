# Gameplay Contracts — V1 (LOCKED)

This file is the authoritative contract set for:
time, regen, action AP costs, meters, stress, combat, progression, death, items, districts, visibility.

---

## 1) Time model (tick + day/night)
- Tick length (V1): **5 minutes real time**
- 24h = **288 ticks**
- Day/Night (V1 placeholder): derived from worldTick modulo 288 (cosmetic only)

---

## 2) AP/HP regen contract — V1
Caps (locked):
- Player AP cap: **3**
- Player HP cap: **100**

Regen cadence (locked):
- Each tick:
  - `AP += 1` up to cap (3)
  - `HP += 2` up to cap (100)

Notes (locked):
- Regen applies even if player is offline.
- If player is DOWNED (`hp <= 0`), HP regen still happens, but the player stays DOWNED until they choose to stand (see Death/Downtime).

---

## 3) Action AP costs — V1
Base costs (locked):
- MOVE (normal): **1 AP**
- MOVE (overweight): **2 AP**
- SEARCH: **1 AP**
- ATTACK (melee): **1 AP**
- ATTACK (ranged): **2 AP**
- REPAIR (any): **1 AP**
- BARRICADE / DEBARRICADE / SECURE: **1 AP**

---

## 4) Survival meters (Hunger / Hydration) — V1
Meter range (V1): **0..4** (4 = full, 0 = empty)

Cadence (locked):
- Hunger: **-1 every 6 hours** ⇒ every **72 ticks**
- Hydration: **-1 every 6 hours** ⇒ every **72 ticks**
- Maximum drain per 24h: **-4** (because 24h / 6h = 4 steps)

At 0 (locked):
- No death.
- Hitting 0 forces stress to max (see Stress contract).

Restoration (locked):
- Only food restores hunger.
- Only liquids restore hydration.

Item restore amounts (locked):
- `WATER_BOTTLE`: Hydration **+2**
- `SODA_CAN`: Hydration **+1**
- `CANNED_FOOD`: Hunger **+1**
- `MRE`: Hunger **+2**

Working water auto-refresh (locked V1 interpretation):
- If player is in an **inside** cell with **water available**, then:
  - every **12 ticks** (1 hour), Hydration increases by **+1** up to max (4).

---

## 5) Stress contract (levels + penalties) — V1
Stress levels: **0..4**

What it affects (locked):
- Combat hit chance
- Repair success/progress
- Search quality (rare weighting)

Penalties (locked):
- `hitChance -= 0.05 * stressLevel`
- `repairSuccessChance -= 0.10 * stressLevel`
  - (If repair is modeled as progress-without-failure, apply this as progress multiplier instead.)
- `searchRareWeightMultiplier *= (1 - 0.15 * stressLevel)`

Dead Calm (locked):
- `effectiveStress = max(0, stressLevel - DeadCalmRank)`

---

## 6) Combat contract (concrete formulas) — V1
Crits: **none**

Hit chance:
- `hitChance = clamp(0.10..0.95, base + attackerHitBonus - targetDodge - stressPenalty)`
- `base = 0.65`
- `attackerHitBonus = 0.03 * skillRank`
  - guns use FirearmsRank
  - melee uses MeleeRank
- `targetDodge = 0.02 * targetAthleticsRank`
- `stressPenalty = 0.05 * effectiveStress` (from Stress contract)

Damage:
- `raw = weapon.damage * rand(0.85..1.15)`

Armor mitigation:
- `final = max(1, raw - armorFlat)`
- `armorFlat = sum(equippedArmor.armor)`

Barriers vs actors (locked):
- Same combat model.
- Barrier dodge = 0.
- Barrier armor = 0 unless explicitly defined later.

---

## 7) SEARCH contract — V1 (single authoritative copy)
- 1 SEARCH action = **1 roll**
- Each SEARCH: `cell.search.remaining -= 1`
- When `remaining == 0`: hard stop (“there’s nothing left to find”)
- Finder modifier: **TODO pick exactly one** (do not stack):
  - Option A: +1 extra roll
  - Option B: reroll junk once

---

## 8) Repairs contract (toolkit + parts) — V1
Toolkit-only window (locked):
- Toolkit-only repair is allowed until the repaired object reaches **~50%, not a hard rule, of its maxHp**.
  - Example: if `maxHp = 50`, toolkit-only can get it up to ~`25` hp.

After ~50% threshold (locked):
- Each repair action consumes:
  - toolkit durability AND
  - 1 part item per action

Parts mapping (locked):
- `FUSE_KIT` repairs fuse boxes (1 per action)
- `PIPE_PATCH` repairs water mains (1 per action)

Facility restore action counts are defined in District Objectives below.

---

## 9) District objectives contract (power/water/ISP) — V1
Facility per district (locked):
- Power: `TRANSFORMER_SUBSTATION`
- Water: `WATER_PLANT` (add building type for this concept)
- ISP: `ISP` is the config key, but gameplay name is **ISP** ISP WAS radio_station before, change it where we find it.

Flip OFF rule (locked):
- Utility flips OFF if the district facility cell has:
  - `ruined == true` OR `hp <= 0`

Restore loop (deterministic, locked):
1) Facility cell must have **0 zombies** on it.
2) Repair facility cell `hp` to **>= 50%** using TOOLKIT actions (no parts).
3) Repair facility infra with fixed action counts:
   - Power: fix fuse using `FUSE_KIT` for **3 actions**
   - Water: fix water using `PIPE_PATCH` for **3 actions**
   - ISP: fix fuse using `FUSE_KIT` for **2 actions**
4) When completed: utility flips ON.

Zombie takedown (locked concept):
- Zombies damage facility cell hp and/or its fuse/water as they roam inside (using the same targeting priority rules).

---

## 10) Visibility / information — V1
Fog-of-war: **OFF** (whole map visible)

Without interacting (locked):
- Show building type + floor count from mapMeta; show inside/outside.
- Do NOT show exact HP; show integrity labels only if known.

On same cell (locked):
- Show exact HP for:
  - current cell infra
  - relevant edge barrier connected to this cell

---

## 11) Progression currency loop (skills) — V1
Currency: **Skill Points (SP)** on player.

Gain SP (locked):
- +1 SP per zombie kill (last-hit credit).
- +1 SP per 20 meaningful actions (SEARCH / REPAIR / BARRICADE / ATTACK) that actually change state.

Anti-grind (locked):
- Only count actions if state changes:
  - SEARCH counts only if remaining decreases and a roll happens.
  - REPAIR counts only if hp increases.
  - BARRICADE counts only if barricadeLevel changes.
  - ATTACK counts only if damage > 0.

Rank-up costs (locked):
- R1: 2 SP
- R2: 3 SP
- R3: 4 SP
- R4: 6 SP
- R5: 8 SP
- R6: 10 SP

---

## 12) Death / downtime — V1
Downed:
- `hp <= 0` → DOWNED

Standing up (locked):
- Player stands up ONLY when they choose (i.e., when online/active).
- Stand-up costs **10 AP** and sets hp to **10 HP**.

No auto-stand (locked):
- No stand-up occurs while player is offline.

No invulnerability (locked):
- No spawn-camp protection / invuln in V1.

Inventory (locked):
- Nothing drops.
- Corpse cannot be looted.

Downed state fields (locked v1):
- `isDowned: boolean`
- `downedAt: timestamp|null`
- (Everything else is derived from hp/ap at runtime.)

---

## 13) Item rules beyond “exists” — V1
Stacking (locked):
- Stackable: ammo, bandage, painkiller, antiseptic, water, soda, canned food, MRE, stim, doses
- Non-stackable: weapons, armor, backpack, cart, toolkit, generator, fuse_kit, pipe_patch

Ammo packaging (locked):
- `AMMO_9MM`: 10 rounds
- `AMMO_SHELL`: 5 shells
- `AMMO_556`: 10 rounds

Ammo use (locked):
- Guns consume **1 ammo per attack**

Durability loss triggers (locked):
- Melee: -1 durability on hit
- Guns: -1 durability per attack
- Armor: -1 durability when it absorbs damage
- Toolkit: loses durability when repair increases hp

Dropped item persistence (locked):
- Dropped items persist for **24h (288 ticks)** then despawn

---

## 14) Multiplayer interaction rules — V1
PvP: **OFF**  
Stealing/looting other players: **OFF**

Doors/barricades (locked):
- Anyone can debarricade.

ISP gameplay effect (locked):
- Global chat always ON.
- District chat + DMs require **ispOn** for the sender’s district.

---

## 15) Win/lose / endgame stub — V1
No win condition in V1 (sandbox survival).

Endgame placeholder (locked):
- “Rescue Event”
- Stub trigger: restore power + water + ISP in all districts simultaneously for **24h** → extraction window later.