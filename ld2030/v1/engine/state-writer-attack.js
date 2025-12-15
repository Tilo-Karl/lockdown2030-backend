// ld2030/v1/engine/state-writer-attack.js
// Unified attack path: id-only. NO legacy wrappers.
// Uses weapon (if equipped) + armor (if present) + currentHp/currentAp/currentDurability.

const { resolveEntityConfig } = require('../entity');

module.exports = function makeAttackStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-attack: db is required');
  if (!admin) throw new Error('state-writer-attack: admin is required');
  if (!state) throw new Error('state-writer-attack: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  async function findEntityByIdTx(tx, gameId, entityId) {
    const cols = [
      state.playersCol(gameId),
      state.zombiesCol(gameId),
      state.humansCol(gameId),
      state.itemsCol(gameId),
    ];

    for (const col of cols) {
      const ref = col.doc(entityId);
      const snap = await tx.get(ref);
      if (snap.exists) {
        return { ref, data: snap.data() || {} };
      }
    }
    return null;
  }

  function isFiniteNum(x) {
    return Number.isFinite(x);
  }

  function clamp01(x) {
    if (!Number.isFinite(x)) return 0;
    if (x < 0) return 0;
    if (x > 1) return 1;
    return x;
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

    await db.runTransaction(async (tx) => {
      const attackerInfo = await findEntityByIdTx(tx, gameId, attackerId);
      if (!attackerInfo) throw new Error('attackEntity: attacker_not_found');

      const targetInfo = await findEntityByIdTx(tx, gameId, targetId);
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
          const wRef = state.itemsCol(gameId).doc(weaponId);
          const wSnap = await tx.get(wRef);
          if (!wSnap.exists) throw new Error('attackEntity: weapon_missing');
          weaponItem = wSnap.data() || {};
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

      const hitChance = clamp01(
        baseHit + (isFiniteNum(weaponItem?.hitChanceBonus) ? weaponItem.hitChanceBonus : 0)
      );

      const gateAp = attacker.isPlayer === true;
      const curAp = isFiniteNum(attacker.currentAp) ? attacker.currentAp : 0;

      if (gateAp && curAp < apCost) throw new Error('attackEntity: not_enough_ap');

      const nextAp = gateAp ? Math.max(0, curAp - apCost) : curAp;

      // Roll hit/miss (still spends AP if player)
      const hitRoll = Math.random();
      const didHit = hitRoll <= hitChance;

      // Apply damage to actors vs items
      let targetWrite = { updatedAt: serverTs() };

      if (didHit) {
        if (tType === 'ITEM') {
          const destructible = target.destructible !== false;
          const curDur = isFiniteNum(target.currentDurability) ? target.currentDurability : 0;

          if (!destructible) {
            targetWrite = { updatedAt: serverTs() };
          } else {
            const nextDur = Math.max(0, curDur - rawDamage);
            targetWrite.currentDurability = nextDur;
            targetWrite.broken = nextDur <= 0;
          }
        } else {
          const alive = target.alive !== false;
          if (!alive) throw new Error('attackEntity: target_dead');

          const curHp = isFiniteNum(target.currentHp) ? target.currentHp : 0;
          const tArmor = isFiniteNum(target.armor) ? target.armor : 0;
          const effectiveDamage = Math.max(0, rawDamage - tArmor);

          const nextHp = Math.max(0, curHp - effectiveDamage);

          targetWrite.currentHp = nextHp;
          targetWrite.alive = nextHp > 0;
          if (nextHp <= 0) targetWrite.downed = true;
        }
      }

      // Attacker write (AP)
      const attackerWrite = { updatedAt: serverTs() };
      if (gateAp) attackerWrite.currentAp = nextAp;

      tx.set(attackerRef, attackerWrite, { merge: true });
      tx.set(targetRef, targetWrite, { merge: true });

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
        currentDurability: targetSnapshot?.currentDurability ?? null,
        alive: targetSnapshot?.alive ?? null,
        broken: targetSnapshot?.broken ?? null,
      },
    };
  }

  return { attackEntity };
};