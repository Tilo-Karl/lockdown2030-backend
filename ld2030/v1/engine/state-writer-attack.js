// ld2030/v1/engine/state-writer-attack.js
// Combat / unified attack path.

const { resolveEntityConfig } = require('../entity');

module.exports = function makeAttackStateWriter({ db, admin, state }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  function colForType(gameId, type) {
    if (type === 'PLAYER') return state.playersCol(gameId);
    if (type === 'ZOMBIE') return state.zombiesCol(gameId);
    if (type === 'HUMAN_NPC') return state.npcsCol(gameId);
    if (type === 'ITEM') return state.itemsCol(gameId);
    throw new Error(`attackEntity: unsupported_type_${type}`);
  }

  /**
   * Core unified attack helper.
   * attackerType / targetType: 'PLAYER' | 'ZOMBIE' | 'HUMAN_NPC' | 'ITEM'
   */
  async function attackEntity({
    gameId = 'lockdown2030',
    attackerType,
    attackerId,
    targetType,
    targetId,
    overrideDamage,
    overrideApCost,
  }) {
    if (!attackerType || !attackerId || !targetType || !targetId) {
      throw new Error(
        'attackEntity: attackerType/attackerId/targetType/targetId are required'
      );
    }

    const attackerCol = colForType(gameId, attackerType);
    const targetCol = colForType(gameId, targetType);

    const attackerRef = attackerCol.doc(attackerId);
    const targetRef = targetCol.doc(targetId);

    let attackerHp = null;
    let attackerAp = null;
    let targetHp = null;

    await db.runTransaction(async (tx) => {
      const [attSnap, tgtSnap] = await Promise.all([
        tx.get(attackerRef),
        tx.get(targetRef),
      ]);

      if (!attSnap.exists || !tgtSnap.exists) {
        throw new Error('attackEntity: entity_not_found');
      }

      const attackerData = attSnap.data() || {};
      const targetData = tgtSnap.data() || {};

      // Resolve configs based on stored entity docs (type/kind).
      const attackerDescriptor = attackerData.type
        ? attackerData
        : { type: attackerType, kind: 'DEFAULT' };
      const attackerCfg = resolveEntityConfig(attackerDescriptor) || {};

      const apCost =
        overrideApCost ?? attackerCfg.attackApCost ?? 1;
      const damage =
        overrideDamage ?? attackerCfg.attackDamage ?? 1;

      const gateAp = attackerType === 'PLAYER';

      const curAp = attackerData.ap ?? 0;
      if (gateAp && curAp < apCost) {
        throw new Error('attackEntity: not_enough_ap');
      }

      const newAp = gateAp ? Math.max(0, curAp - apCost) : curAp;

      const curHp = targetData.hp ?? 0;
      const newHp = Math.max(0, curHp - damage);

      // Track for return payload
      attackerHp = attackerData.hp ?? null;
      attackerAp = newAp;
      targetHp = newHp;

      const attackerWrite = {
        ...attackerData,
        updatedAt: serverTs(),
      };
      if (gateAp) {
        attackerWrite.ap = newAp;
      }

      tx.set(attackerRef, attackerWrite, { merge: true });

      tx.set(
        targetRef,
        {
          ...targetData,
          hp: newHp,
          alive: newHp > 0,
          updatedAt: serverTs(),
        },
        { merge: true }
      );
    });

    return {
      ok: true,
      attacker: { id: attackerId, hp: attackerHp, ap: attackerAp },
      target: { id: targetId, hp: targetHp },
    };
  }

  /** Thin wrapper: player vs player attack (used by engine ATTACK). */
  async function attackPlayer({
    gameId = 'lockdown2030',
    attackerUid,
    targetUid,
    damage,
    apCost,
  }) {
    return attackEntity({
      gameId,
      attackerType: 'PLAYER',
      attackerId: attackerUid,
      targetType: 'PLAYER',
      targetId: targetUid,
      overrideDamage: damage,
      overrideApCost: apCost,
    });
  }

  /** Thin wrapper: player vs zombie attack (if you still need it anywhere). */
  async function attackZombie({
    gameId = 'lockdown2030',
    attackerUid,
    zombieId,
    damage,
    apCost,
  }) {
    return attackEntity({
      gameId,
      attackerType: 'PLAYER',
      attackerId: attackerUid,
      targetType: 'ZOMBIE',
      targetId: zombieId,
      overrideDamage: damage,
      overrideApCost: apCost,
    });
  }

  return {
    attackEntity,
    attackPlayer,
    attackZombie,
  };
};