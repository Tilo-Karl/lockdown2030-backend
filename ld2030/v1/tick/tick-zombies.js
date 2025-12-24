// ld2030/v1/tick/tick-zombies.js
// Zombies tick against the Big Bang runtime world (edges/* as single truth).
//
// MASTER PLAN SEMANTICS:
// - isDestroyed = truth for “gone/unblocked”
// - NO isBroken anywhere
// - door passable iff isOpen===true OR destroyed (hp<=0)
// - actor.pos is ALWAYS { x, y, z, layer } where layer ∈ {0,1} (NO isInsideBuilding truth)

const { TICK } = require('../config');
const { resolveEntityKey } = require('../entity/resolver');
const { getEntityConfigOrThrow } = require('../entity/registry');
const combat = require('../combat/combat');

const { clamp } = require('./zombie-utils');

const {
  doorEdgeIdForTile,
  doorEndpointsForTile,
  mergeDoorEdge,
  isDoorBlockingZombie,
  computeDoorHp,
  doorDamageFromCfg,
} = require('./zombie-doors');

const {
  stairsEdgeIdFor,
  stairsEndpointsFor,
  mergeStairsEdge,
  isStairsBlockingZombie,
  computeStairsHp,
  stairsDamageFromCfg,
} = require('./zombie-stairs');

async function getBuildingStampAtXY(reader, cache, gameId, x, y) {
  const key = `${x},${y}`;
  if (cache.has(key)) return cache.get(key);

  const cellId = `c_${x}_${y}_0_0`;
  const cell = await reader.getCell(gameId, cellId);
  const stamp = (cell && typeof cell.building === 'object') ? cell.building : null;
  cache.set(key, stamp);
  return stamp;
}

function buildingKey(stamp) {
  const rx = Number(stamp?.root?.x);
  const ry = Number(stamp?.root?.y);
  if (!Number.isFinite(rx) || !Number.isFinite(ry)) return null;
  return `${rx},${ry}`;
}

function makeZombieTicker({ reader, writer }) {
  if (!reader) throw new Error('zombie-ticker: reader is required');
  if (!writer) throw new Error('zombie-ticker: writer is required');
  if (typeof reader.getGame !== 'function') throw new Error('zombie-ticker: reader.getGame is required');
  if (typeof reader.getEdge !== 'function') throw new Error('zombie-ticker: reader.getEdge is required');

  if (typeof writer.updateDoor !== 'function') throw new Error('zombie-ticker: writer.updateDoor is required');
  if (typeof writer.updateStairEdge !== 'function') throw new Error('zombie-ticker: writer.updateStairEdge is required');
  if (typeof writer.updateZombie !== 'function') throw new Error('zombie-ticker: writer.updateZombie is required');
  if (typeof writer.attackEntity !== 'function') throw new Error('zombie-ticker: writer.attackEntity is required');

  function dirs() {
    return [
      { dx: 0, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
  }

  function nInt(x, fallback = 0) {
    const v = Number(x);
    return Number.isFinite(v) ? Math.trunc(v) : fallback;
  }

  function clampLayer(x) {
    const v = nInt(x, 0);
    return (v === 1) ? 1 : 0;
  }

  async function buildPlayersByPos({ gameId, width, height }) {
    const playersByPos = new Map();
    if (typeof reader.playersCol !== 'function') return playersByPos;

    const pSnap = await reader.playersCol(gameId).get();
    const pDocs = pSnap.docs || [];
    for (const pDoc of pDocs) {
      const uid = pDoc.id;
      const p = pDoc.data() || {};
      if (!uid || uid.startsWith('_')) continue;
      if (p.alive === false) continue;

      const pos = (p.pos && typeof p.pos === 'object') ? p.pos : null;
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') continue;

      const px = clamp(pos.x, 0, width - 1);
      const py = clamp(pos.y, 0, height - 1);

      // Big Bang truth: pos.layer is authoritative.
      // If older docs exist without layer, treat as outside (layer=0) (read-only fallback).
      const layer = Number.isFinite(pos.layer) ? clampLayer(pos.layer) : 0;

      // Outside always uses z=0; inside uses actual z.
      const rawZ = Number.isFinite(pos.z) ? nInt(pos.z, 0) : 0;
      const pz = (layer === 1) ? rawZ : 0;

      const key = `${px},${py},${pz},${layer}`;
      if (!playersByPos.has(key)) playersByPos.set(key, []);
      playersByPos.get(key).push(uid);
    }
    return playersByPos;
  }

  async function tickZombies({ gameId = 'lockdown2030', now } = {}) {
    const col = reader.zombiesCol(gameId);
    if (!col) return { updated: 0, total: 0, alive: 0 };

    let width = 12;
    let height = 12;
    if (typeof reader.readGridSize === 'function') {
      const { w, h } = await reader.readGridSize(gameId, { w: 12, h: 12 });
      width = Number.isFinite(w) ? w : 12;
      height = Number.isFinite(h) ? h : 12;
    }

    const buildingStampCache = new Map();
    const playersByPos = await buildPlayersByPos({ gameId, width, height });

    const snap = await col.get();
    const docs = snap.docs || [];

    let total = 0;
    let alive = 0;
    let moved = 0;

    let doorsHit = 0;
    let doorsDestroyed = 0;
    let zombiesEntered = 0;

    let stairsHit = 0;
    let stairsDestroyed = 0;

    let playersHit = 0;

    const roamDefault = Number(TICK?.ZOMBIE?.ROAM ?? 1);

    for (const doc of docs) {
      total += 1;
      const z = doc.data() || {};

      const pos = (z.pos && typeof z.pos === 'object') ? z.pos : null;
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') continue;

      if (z.alive === false) continue;
      alive += 1;

      const kind = z.kind || 'WALKER';
      const eKey = resolveEntityKey('ZOMBIE', kind);
      if (!eKey) continue;

      const cfg = getEntityConfigOrThrow(eKey);

      const x = clamp(pos.x, 0, width - 1);
      const y = clamp(pos.y, 0, height - 1);

      const layer0 = Number.isFinite(pos.layer) ? clampLayer(pos.layer) : 0;
      const inside0 = (layer0 === 1);
      const z0 = inside0 ? nInt(pos.z, 0) : 0;

      const roam =
        Number.isFinite(cfg.maxRoamDistance) ? Number(cfg.maxRoamDistance) :
        Number.isFinite(roamDefault) ? roamDefault :
        1;

      const choice = dirs()[Math.floor(Math.random() * dirs().length)];
      const stepX = Math.max(-roam, Math.min(choice.dx, roam));
      const stepY = Math.max(-roam, Math.min(choice.dy, roam));

      let nx = clamp(x + stepX, 0, width - 1);
      let ny = clamp(y + stepY, 0, height - 1);

      let nextLayer = layer0;
      let nz = (nextLayer === 1) ? z0 : 0;

      const fromStamp = await getBuildingStampAtXY(reader, buildingStampCache, gameId, x, y);
      const fromBuildingId = buildingKey(fromStamp);
      const toStamp =
        (nx === x && ny === y)
          ? fromStamp
          : await getBuildingStampAtXY(reader, buildingStampCache, gameId, nx, ny);
      const toBuildingId = buildingKey(toStamp);

      // If we start inside, we can only remain inside if we stay within the same building tile footprint.
      if (nextLayer === 1) {
        if (!fromBuildingId) {
          nextLayer = 0; nz = 0;
        } else if (toBuildingId !== fromBuildingId) {
          nextLayer = 0; nz = 0;
        }
      }

      // OUTSIDE step onto building tile -> handle door edge OR hit player outside
      if (nextLayer === 0) {
        const curBuildingId = toBuildingId;
        if (curBuildingId) {
          const outsideKey = `${nx},${ny},0,0`;
          const pOutside = playersByPos.get(outsideKey);

          if (pOutside && pOutside.length) {
            playersHit += 1;
            await writer.attackEntity({ gameId, attackerId: doc.id, targetId: pOutside[0] });
          } else {
            const doorEdgeId = doorEdgeIdForTile(nx, ny);
            const rawDoorEdge = await reader.getEdge(gameId, doorEdgeId);
            const d = mergeDoorEdge(nx, ny, rawDoorEdge);

            if (isDoorBlockingZombie(d)) {
              doorsHit += 1;

              const curHp = Number.isFinite(d.hp) ? Number(d.hp) : computeDoorHp(d);
              const raw = doorDamageFromCfg(cfg);

              const dmg = combat.computeDamage({ rawDamage: raw, armor: 0 });
              const applied = combat.applyDamageToItem({
                currentDurability: curHp,
                damage: dmg,
                destructible: true,
              });

              const nextHp = Math.max(0, Number(applied.nextDurability ?? 0));

              if (nextHp <= 0) {
                doorsDestroyed += 1;

                await writer.updateDoor(gameId, doorEdgeId, {
                  ...doorEndpointsForTile(nx, ny),

                  hp: 0,
                  isDestroyed: true,

                  isOpen: true,
                  isSecured: false,
                  barricadeLevel: 0,
                });

                nextLayer = 1;
                zombiesEntered += 1;
                nz = 0;
              } else {
                await writer.updateDoor(gameId, doorEdgeId, {
                  ...doorEndpointsForTile(nx, ny),

                  hp: nextHp,
                  isDestroyed: false,
                  isOpen: false,
                });
              }
            } else {
              nextLayer = 1;
              zombiesEntered += 1;
              nz = 0;
            }
          }
        }
      }

      // INSIDE behavior: stairs edges between floors
      if (nextLayer === 1) {
        const bId = toBuildingId;
        if (!bId) {
          nextLayer = 0; nz = 0;
        } else {
          const floors = Number.isFinite(toStamp?.floors) ? Number(toStamp.floors) : 1;

          if (floors <= 1) {
            nz = 0;
          } else {
            const stairsChance =
              Number.isFinite(TICK?.ZOMBIE?.STAIRS_CHANCE) ? Number(TICK.ZOMBIE.STAIRS_CHANCE) :
              Number.isFinite(cfg?.stairsChance) ? Number(cfg.stairsChance) :
              0.25;

            nz = clamp(nz, 0, floors - 1);

            if (Math.random() < stairsChance) {
              const dz = Math.random() < 0.5 ? -1 : 1;
              const targetZ = clamp(nz + dz, 0, floors - 1);

              if (targetZ !== nz) {
                const edgeZ = Math.min(nz, targetZ);
                const stairsEdgeId = stairsEdgeIdFor(nx, ny, edgeZ);

                const rawStairsEdge = await reader.getEdge(gameId, stairsEdgeId);
                const s = mergeStairsEdge(nx, ny, edgeZ, rawStairsEdge);

                if (isStairsBlockingZombie(s)) {
                  stairsHit += 1;

                  const curHp = Number.isFinite(s.hp) ? Number(s.hp) : computeStairsHp(s);
                  const raw = stairsDamageFromCfg(cfg);

                  const dmg = combat.computeDamage({ rawDamage: raw, armor: 0 });
                  const applied = combat.applyDamageToItem({
                    currentDurability: curHp,
                    damage: dmg,
                    destructible: true,
                  });

                  const nextHp = Math.max(0, Number(applied.nextDurability ?? 0));

                  if (nextHp <= 0) {
                    stairsDestroyed += 1;

                    await writer.updateStairEdge(gameId, stairsEdgeId, {
                      ...stairsEndpointsFor(nx, ny, edgeZ),

                      hp: 0,
                      isDestroyed: true,
                      barricadeLevel: 0,
                    });

                    nz = targetZ;
                  } else {
                    await writer.updateStairEdge(gameId, stairsEdgeId, {
                      ...stairsEndpointsFor(nx, ny, edgeZ),

                      hp: nextHp,
                      isDestroyed: false,
                    });
                  }
                } else {
                  nz = targetZ;
                }
              }
            }
          }
        }
      }

      // Inside attack check (same cell)
      if (nextLayer === 1) {
        const insideKey = `${nx},${ny},${nz},1`;
        const pInside = playersByPos.get(insideKey);
        if (pInside && pInside.length) {
          playersHit += 1;
          await writer.attackEntity({ gameId, attackerId: doc.id, targetId: pInside[0] });
        }
      }

      if (nx !== x || ny !== y || nz !== z0 || nextLayer !== layer0) moved += 1;

      await writer.updateZombie(gameId, doc.id, {
        pos: { x: nx, y: ny, z: nz, layer: nextLayer },
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
      doorsDestroyed,

      stairsHit,
      stairsDestroyed,

      playersHit,

      tickConfig: TICK?.ZOMBIE || null,
    };
  }

  return { tickZombies };
}

module.exports = makeZombieTicker;
