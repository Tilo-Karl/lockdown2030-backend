// ld2030/v1/engine/state-writer-attack.js
// Unified attack path: id-only. NO legacy wrappers.
// Uses weapon (if equipped) + armor (if present) + currentHp/currentAp/durability.
// Combat math centralized in ../combat/combat.js
// Emits events into games/{gameId}/events in the SAME transaction (single-tx truth).

const { resolveEntityConfig } = require('../entity');
const combat = require('../combat/combat');
const { EVENT_TYPES, MESSAGE_KEYS } = require('../events/event-constants');
const makeEventsWriter = require('./state-writer-events');
const makeTx = require('./tx');
const { findEntityByIdTx, readItemByIdTx } = require('./entity-tx-helpers');

module.exports = function makeAttackStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-attack: db is required');
  if (!admin) throw new Error('state-writer-attack: admin is required');
  if (!state) throw new Error('state-writer-attack: state is required');

  const txHelpers = makeTx({ db, admin });
  const { run, setWithMeta } = txHelpers;

  // Local instance is fine; it only provides appendEventsTx(tx, ...) and shares deps.
  const eventsWriter = makeEventsWriter({ db, admin, state });

  function isFiniteNum(x) {
    return Number.isFinite(x);
  }

  async function attackEntity({
    gameId = 'lockdown2030',
    attackerId,
    targetId,
    overrideDamage,
    overrideApCost,
  }) {
    if (!attackerId || !targetId) throw new Error('attackEntity: attackerId and targetId are required');

    let attackerSnapshot = null;
    let targetSnapshot = null;

    await run('attackEntity', async (tx) => {
      const attackerInfo = await findEntityByIdTx({ tx, state, gameId, entityId: attackerId, includeItems: true });
      if (!attackerInfo) throw new Error('attackEntity: attacker_not_found');

      const targetInfo = await findEntityByIdTx({ tx, state, gameId, entityId: targetId, includeItems: true });
      if (!targetInfo) throw new Error('attackEntity: target_not_found');

      const attackerRef = attackerInfo.ref;
      const targetRef = targetInfo.ref;

      const attacker = attackerInfo.data;
      const target = targetInfo.data;

      const aType = String(attacker.type || '').toUpperCase();
      const aKind = String(attacker.kind || '').toUpperCase();
      const tType = String(target.type || '').toUpperCase();
      const tKind = String(target.kind || '').toUpperCase();

      if (!aType || !aKind) throw new Error('attackEntity: attacker_missing_type_or_kind');
      if (!tType || !tKind) throw new Error('attackEntity: target_missing_type_or_kind');

      const attackerCfg = resolveEntityConfig(aType, aKind) || {};

      // Weapon overrides (HUMAN only)
      let weaponItem = null;
      if (aType === 'HUMAN') {
        const weaponId = attacker.equipment?.weapon?.main || null;
        if (weaponId) {
          const weaponInfo = await readItemByIdTx({ tx, state, gameId, itemId: weaponId });
          if (!weaponInfo) throw new Error('attackEntity: weapon_missing');
          weaponItem = weaponInfo.data || {};
          if (String(weaponItem.type || '').toUpperCase() !== 'ITEM') throw new Error('attackEntity: weapon_invalid_type');
          if (weaponItem.slot !== 'weapon') throw new Error('attackEntity: weapon_invalid_slot');
        }
      }

      const baseApCost = isFiniteNum(attackerCfg.attackApCost) ? attackerCfg.attackApCost : 1;
      const baseDamage = isFiniteNum(attackerCfg.attackDamage) ? attackerCfg.attackDamage : 1;
      const baseHit = isFiniteNum(attackerCfg.hitChance) ? attackerCfg.hitChance : 0.8;

      const apCost = overrideApCost ?? (
        isFiniteNum(weaponItem?.attackApCost) ? weaponItem.attackApCost : baseApCost
      );

      const rawDamage = overrideDamage ?? (
        isFiniteNum(weaponItem?.damage) ? weaponItem.damage : baseDamage
      );

      const weaponBonusHit = isFiniteNum(weaponItem?.hitChanceBonus) ? weaponItem.hitChanceBonus : 0;
      const hitChance = combat.computeHitChance({ baseHit, weaponBonus: weaponBonusHit });

      const gateAp = attacker.isPlayer === true;
      const curAp = isFiniteNum(attacker.currentAp) ? attacker.currentAp : 0;

      if (gateAp && curAp < apCost) throw new Error('attackEntity: not_enough_ap');

      // AP is spent even on miss (players only)
      const nextAp = gateAp ? Math.max(0, curAp - apCost) : curAp;

      // Roll hit/miss via combat helper (rng injected)
      const didHit = combat.rollHit(() => Math.random(), hitChance);

      // Prepare writes
      const attackerWrite = gateAp ? { currentAp: nextAp } : {};

      let targetWrite = {};

      // Event payload building (small + stable)
      const pos = attacker?.pos && typeof attacker.pos === 'object' ? attacker.pos : null;
      const weaponKind = weaponItem?.kind ? String(weaponItem.kind) : null;

      const events = [];

      // 1) Always emit attempt
      events.push({
        type: EVENT_TYPES.COMBAT_ATTACK,
        messageKey: MESSAGE_KEYS.COMBAT_ATTACK,
        args: { apCost, weaponKind },
        actorId: attackerId,
        targetId,
        pos,
      });

      // Apply hit (if any)
      let effectiveDamage = 0;
      let targetHpAfter = null;
      let targetDurAfter = null;
      let killed = false;

      if (didHit) {
        if (tType === 'ITEM') {
          const destructible = target.destructible !== false;
          const curDur = isFiniteNum(target.durability) ? target.durability : 0;

          const out = combat.applyDamageToItem({
            durability: curDur,
            damage: rawDamage,
            destructible,
          });

          // If not destructible, out.nextDurability may equal curDur; still fine.
          targetWrite.durability = out.nextDurability;
          targetWrite.broken = out.broken === true;

          effectiveDamage = destructible ? Math.max(0, curDur - out.nextDurability) : 0;
          targetDurAfter = out.nextDurability;
        } else {
          const alive = target.alive !== false;
          if (!alive) throw new Error('attackEntity: target_dead');

          const curHp = isFiniteNum(target.currentHp) ? target.currentHp : 0;
          const tArmor = isFiniteNum(target.armor) ? target.armor : 0;

          effectiveDamage = combat.computeDamage({ rawDamage, armor: tArmor });

          const out = combat.applyDamageToActor({
            currentHp: curHp,
            damage: effectiveDamage,
          });

          targetWrite.currentHp = out.nextHp;
          targetWrite.alive = out.isAlive;
          if (out.isDowned) targetWrite.isDowned = true;

          targetHpAfter = out.nextHp;
          killed = out.isAlive === false;
        }

        // 2) Hit event
        events.push({
          type: EVENT_TYPES.COMBAT_HIT,
          messageKey: MESSAGE_KEYS.COMBAT_HIT,
          args: {
            rawDamage,
            effectiveDamage,
            targetHpAfter,
            targetDurAfter,
          },
          actorId: attackerId,
          targetId,
          pos,
        });

        // 3) Kill event (actors only, when they drop)
        if (killed) {
          events.push({
            type: EVENT_TYPES.COMBAT_KILL,
            messageKey: MESSAGE_KEYS.COMBAT_KILL,
            args: {},
            actorId: attackerId,
            targetId,
            pos,
          });
        }
      } else {
        // Miss event
        events.push({
          type: EVENT_TYPES.COMBAT_MISS,
          messageKey: MESSAGE_KEYS.COMBAT_MISS,
          args: {},
          actorId: attackerId,
          targetId,
          pos,
        });
      }

      // Persist writes
      setWithMeta(tx, attackerRef, attackerWrite, attackerInfo.snap);
      setWithMeta(tx, targetRef, targetWrite, targetInfo.snap);

      // Persist events in SAME tx (bounded feed writer handles seq + retention)
    if (!eventsWriter || typeof eventsWriter.appendEventsTx !== 'function') {
        throw new Error('attackEntity: events_writer_missing_appendEventsTx');
    }

    await eventsWriter.appendEventsTx(tx, { gameId, events });

      attackerSnapshot = { ...attacker, ...attackerWrite };
      targetSnapshot = { ...target, ...targetWrite };
    });

    return {
      ok: true,
      attacker: {
        id: attackerId,
        type: attackerSnapshot?.type || null,
        kind: attackerSnapshot?.kind || null,
        isPlayer: attackerSnapshot?.isPlayer === true,
        currentHp: attackerSnapshot?.currentHp ?? null,
        currentAp: attackerSnapshot?.currentAp ?? null,
      },
      target: {
        id: targetId,
        type: targetSnapshot?.type || null,
        kind: targetSnapshot?.kind || null,
        currentHp: targetSnapshot?.currentHp ?? null,
        durability: targetSnapshot?.durability ?? null,
        alive: targetSnapshot?.alive ?? null,
        isDowned: targetSnapshot?.isDowned ?? null,
        broken: targetSnapshot?.broken ?? null,
      },
    };
  }

  return { attackEntity };
};
