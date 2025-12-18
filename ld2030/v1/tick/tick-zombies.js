// ld2030/v1/tick/tick-zombies.js
// Per-tick zombie updates.
// Entity system only.
//
// Doors v1 (tick 1+2+3) — corrected model:
// - Zombies can wander onto building footprint tiles while still "outside" (isInsideBuilding=false).
// - If a zombie is standing on a building tile AND isOutside, it may try to ENTER.
//   - If player is OUTSIDE on same tile => attack player first (no door hit this tick).
//   - If door exists and is CLOSED (broken=false, isOpen=false) => attack door (same tile), stay outside.
//   - If door is OPEN or BROKEN => enter (set isInsideBuilding=true).
//   - If no door doc exists on that tile => enter.
// - Once inside, zombies can move within the same building footprint; stepping off footprint => implicit EXIT.
// - If inside and player is INSIDE on same tile+floor => attack player (same tile).

const { TICK, DOOR } = require('../config');
const { resolveEntityKey } = require('../entity/resolver');
const { getEntityConfigOrThrow } = require('../entity/registry');
const { getBuildingIndex } = require('../engine/building-index');

function makeZombieTicker({ reader, writer }) {
  if (!reader) throw new Error('zombie-ticker: reader is required');
  if (!writer) throw new Error('zombie-ticker: writer is required');

  function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.max(min, Math.min(max, x));
  }

  function doorIdForTile(x, y) {
    return `d_${x}_${y}`;
  }

  function doorDefaults(x, y) {
    return {
      doorId: doorIdForTile(x, y),
      x,
      y,
      isOpen: false,
      isSecured: false,
      barricadeLevel: 0,
      broken: false,
      hp: 0,
    };
  }

  function mergeDoor(x, y, raw) {
    return raw ? { ...doorDefaults(x, y), ...raw } : null; // null means "no door doc"
  }

  function isDoorBlockingZombie(d) {
    if (!d) return false; // no door doc => no block
    if (d.broken === true) return false;
    if (d.isOpen === true) return false;
    return true; // closed blocks
  }

  function computeDoorHp(d) {
    const existing = Number.isFinite(d?.hp) ? Number(d.hp) : 0;
    if (existing > 0) return existing;

    const baseHp = Number.isFinite(DOOR?.BASE_HP) ? Number(DOOR.BASE_HP) : 3;
    const secureHp = d?.isSecured === true
      ? (Number.isFinite(DOOR?.SECURE_HP) ? Number(DOOR.SECURE_HP) : 2)
      : 0;

    const perBarr = Number.isFinite(DOOR?.HP_PER_BARRICADE_LEVEL)
      ? Number(DOOR.HP_PER_BARRICADE_LEVEL)
      : 3;

    const lvl = Number.isFinite(d?.barricadeLevel) ? Number(d.barricadeLevel) : 0;

    return Math.max(1, baseHp + secureHp + Math.max(0, lvl) * perBarr);
  }

  function doorDamageFromCfg(cfg) {
    const dmg =
      (Number.isFinite(cfg?.doorDamage) ? Number(cfg.doorDamage) : null) ??
      (Number.isFinite(cfg?.attackDamage) ? Number(cfg.attackDamage) : null) ??
      1;
    return Math.max(1, Math.trunc(dmg));
  }

  async function tickZombies({ gameId = 'lockdown2030', now } = {}) {
    const col = reader.zombiesCol(gameId);
    if (!col) return { updated: 0, total: 0, alive: 0 };

    // Grid bounds (hard fail -> default 12x12)
    let width = 12;
    let height = 12;
    if (typeof reader.readGridSize === 'function') {
      const { w, h } = await reader.readGridSize(gameId, { w: 12, h: 12 });
      width = Number.isFinite(w) ? w : 12;
      height = Number.isFinite(h) ? h : 12;
    }

    // Building footprint lookup
    let byXY = new Map();
    let byId = new Map();
    if (typeof reader.getGame === 'function') {
      const game = await reader.getGame(gameId);
      if (game && game.mapMeta) {
        const idx = getBuildingIndex(game, game.mapMeta);
        byXY = idx?.byXY instanceof Map ? idx.byXY : new Map();
        byId = idx?.byId instanceof Map ? idx.byId : new Map();
      }
    }

    // Preload players by position for "same tile" attacks (no adjacency attacks).
    // Key: "x,y,z,insideFlag" where insideFlag is 1 or 0.
    const playersByPos = new Map();
    if (typeof reader.playersCol === 'function') {
      const pSnap = await reader.playersCol(gameId).get();
      const pDocs = pSnap.docs || [];
      for (const pDoc of pDocs) {
        const uid = pDoc.id;
        const p = pDoc.data() || {};
        if (!uid || uid.startsWith('_')) continue;
        if (p.alive === false) continue;
        if (!p.pos || typeof p.pos.x !== 'number' || typeof p.pos.y !== 'number') continue;

        const px = clamp(p.pos.x, 0, width - 1);
        const py = clamp(p.pos.y, 0, height - 1);
        const pInside = p.isInsideBuilding === true;
        const pz = pInside ? (Number.isFinite(p.pos.z) ? Math.trunc(p.pos.z) : 0) : 0;

        const key = `${px},${py},${pz},${pInside ? 1 : 0}`;
        if (!playersByPos.has(key)) playersByPos.set(key, []);
        playersByPos.get(key).push(uid);
      }
    }

    const snap = await col.get();
    const docs = snap.docs || [];

    let total = 0;
    let alive = 0;
    let moved = 0;

    let doorsHit = 0;
    let doorsBroken = 0;
    let zombiesEntered = 0;

    let playersHit = 0;

    const roamDefault = Number(TICK?.ZOMBIE?.ROAM ?? 1);

    for (const doc of docs) {
      total += 1;
      const z = doc.data() || {};

      if (!z.pos || typeof z.pos.x !== 'number' || typeof z.pos.y !== 'number') continue;
      if (z.alive === false) continue;

      alive += 1;

      const kind = z.kind || 'WALKER';
      const key = resolveEntityKey('ZOMBIE', kind);
      if (!key) continue;

      const cfg = getEntityConfigOrThrow(key);

      const x = clamp(z.pos.x, 0, width - 1);
      const y = clamp(z.pos.y, 0, height - 1);
      const z0 = Number.isFinite(z.pos.z) ? Math.trunc(z.pos.z) : 0;

      const roam =
        Number.isFinite(cfg.maxRoamDistance) ? Number(cfg.maxRoamDistance) :
        Number.isFinite(roamDefault) ? roamDefault :
        1;

      const dirs = [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ];

      const choice = dirs[Math.floor(Math.random() * dirs.length)];
      const stepX = Math.max(-roam, Math.min(choice.dx, roam));
      const stepY = Math.max(-roam, Math.min(choice.dy, roam));

      let nx = clamp(x + stepX, 0, width - 1);
      let ny = clamp(y + stepY, 0, height - 1);

      let nextInside = z.isInsideBuilding === true;
      let nz = nextInside ? z0 : 0;

      const fromBuildingId = byXY.get(`${x},${y}`) || null;
      const toBuildingId = byXY.get(`${nx},${ny}`) || null;

      // Inside movement rules: same building footprint only; otherwise implicit exit
      if (nextInside) {
        if (!fromBuildingId) {
          // state mismatch safety
          nextInside = false;
          nz = 0;
        } else if (toBuildingId === fromBuildingId) {
          // ok: move within same building footprint, keep floor
        } else {
          // stepping outside (or to a different building) => exit
          nextInside = false;
          nz = 0;
        }
      }

      // If outside AND standing on a building tile after movement, try to enter / attack the door on THIS TILE.
      if (!nextInside) {
        const curBuildingId = byXY.get(`${nx},${ny}`) || null;

        if (curBuildingId) {
          // Player priority (outside vs outside on SAME TILE)
          const outsideKey = `${nx},${ny},0,0`;
          const pOutside = playersByPos.get(outsideKey);
          if (pOutside && pOutside.length) {
            playersHit += 1;
            await writer.attackEntity({ gameId, attackerId: doc.id, targetId: pOutside[0] });
            // Do NOT hit door this tick if we attacked a player
          } else {
            let rawDoor = null;
            if (typeof reader.getDoor === 'function') {
              rawDoor = await reader.getDoor(gameId, doorIdForTile(nx, ny));
            }

            const d = mergeDoor(nx, ny, rawDoor);

            if (isDoorBlockingZombie(d)) {
              // Attack door ON SAME TILE, do not enter
              doorsHit += 1;

              const curHp = computeDoorHp(d);
              const dmg = doorDamageFromCfg(cfg);
              const nextHp = Math.max(0, curHp - dmg);

              if (nextHp <= 0) {
                doorsBroken += 1;
                await writer.updateDoor(gameId, doorIdForTile(nx, ny), {
                  doorId: doorIdForTile(nx, ny),
                  x: nx,
                  y: ny,
                  broken: true,
                  isOpen: true,
                  isSecured: false,
                  barricadeLevel: 0,
                  hp: 0,
                });
                // After breaking, it can enter immediately (same tick)
                nextInside = true;
                zombiesEntered += 1;
                nz = 0;
              } else {
                await writer.updateDoor(gameId, doorIdForTile(nx, ny), {
                  doorId: doorIdForTile(nx, ny),
                  x: nx,
                  y: ny,
                  hp: nextHp,
                });
              }
            } else {
              // Door is open/broken OR no door doc => enter
              nextInside = true;
              zombiesEntered += 1;
              nz = 0;
            }
          }
        }
      }

      // Zombie stairs: if inside a multi-floor building, sometimes go up/down one floor.
      if (nextInside) {
        const bId = byXY.get(`${nx},${ny}`) || null;
        if (!bId) {
          // safety: inside without footprint -> force out
          nextInside = false;
          nz = 0;
        } else {
          const building = byId.get(bId) || null;
          const floors = Number.isFinite(building?.floors) ? Number(building.floors) : 1;

          if (floors <= 1) {
            nz = 0;
          } else {
            const stairsChance =
              Number.isFinite(TICK?.ZOMBIE?.STAIRS_CHANCE) ? Number(TICK.ZOMBIE.STAIRS_CHANCE) :
              Number.isFinite(cfg?.stairsChance) ? Number(cfg.stairsChance) :
              0.25;

            // keep within bounds even if current z is weird
            nz = clamp(nz, 0, floors - 1);

            if (Math.random() < stairsChance) {
              const dz = Math.random() < 0.5 ? -1 : 1;
              nz = clamp(nz + dz, 0, floors - 1);
            }
          }
        }
      }

      // Player priority (inside vs inside on SAME TILE+FLOOR)
      if (nextInside) {
        const insideKey = `${nx},${ny},${nz},1`;
        const pInside = playersByPos.get(insideKey);
        if (pInside && pInside.length) {
          playersHit += 1;
          await writer.attackEntity({ gameId, attackerId: doc.id, targetId: pInside[0] });
        }
      }

      if (nx !== x || ny !== y || nz !== z0) moved += 1;

      await writer.updateZombie(gameId, doc.id, {
        pos: { x: nx, y: ny, z: nz },
        isInsideBuilding: nextInside === true,
        updatedAt: now || new Date().toISOString(),
      });
    }

    return {
      updated: moved,
      total,
      alive,
      zombiesMoved: moved,
      zombiesTotal: total,
      zombiesEntered,
      doorsHit,
      doorsBroken,
      playersHit,
      tickConfig: TICK?.ZOMBIE || null,
    };
  }

  return { tickZombies };
}

module.exports = makeZombieTicker;