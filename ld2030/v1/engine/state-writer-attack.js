// ld2030/v1/engine/state-writer-attack.js
// Combat / unified attack path.

const { resolveEntityConfig } = require('../entity');

module.exports = function makeAttackStateWriter({ db, admin, state }) {
  if (!db) throw new Error('state-writer-attack: db is required');
  if (!admin) throw new Error('state-writer-attack: admin is required');
  if (!state) throw new Error('state-writer-attack: state is required');

  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  /**
   * Find an entity by id across all known collections.
   * Returns { type, ref, data } or null if not found.
   */
  async function findEntityByIdTx(tx, gameId, entityId) {
    const cols = [
      { type: 'PLAYER', col: state.playersCol(gameId) },
      { type: 'ZOMBIE', col: state.zombiesCol(gameId) },
      { type: 'HUMAN_NPC', col: state.npcsCol(gameId) },
      { type: 'ITEM', col: state.itemsCol(gameId) },
    ];

    for (const entry of cols) {
      const ref = entry.col.doc(entityId);
      const snap = await tx.get(ref);
      if (snap.exists) {
        return {
          type: entry.type,
          ref,
          data: snap.data() || {},
        };
      }
    }

    return null;
  }

  /**
   * Core unified attack helper.
   *
   * For now we assume the attacker is always a PLAYER (the current user),
   * so callers only need to pass attackerId + targetId.
   *
   * Later we can generalize if NPCs / zombies initiate attacks.
   */
  async function attackEntity({
    gameId = 'lockdown2030',
    attackerId,
    targetId,
    overrideDamage,
    overrideApCost,
  }) {
    if (!attackerId || !targetId) {
      throw new Error('attackEntity: attackerId and targetId are required');
    }

    let attackerHp = null;
    let attackerAp = null;
    let targetHp = null;

    let attackerTypeForReturn = null;
    let attackerKindForReturn = null;
    let targetTypeForReturn = null;
    let targetKindForReturn = null;

    let damageForReturn = null;
    let hitForReturn = null;
    let deadForReturn = null;

    await db.runTransaction(async (tx) => {
      // Attacker: we currently only support the player as attacker.
      const attackerRef = state.playersCol(gameId).doc(attackerId);
      const attackerSnap = await tx.get(attackerRef);
      if (!attackerSnap.exists) {
        throw new Error('attackEntity: attacker_not_found');
      }

      const attackerData = attackerSnap.data() || {};

      // Target: probe all collections until we find a matching id.
      const targetInfo = await findEntityByIdTx(tx, gameId, targetId);
      if (!targetInfo) {
        throw new Error('attackEntity: entity_not_found');
      }

      const targetRef = targetInfo.ref;
      const targetData = targetInfo.data;

      // Track types/kinds for the response.
      attackerTypeForReturn = attackerData.type || 'PLAYER';
      attackerKindForReturn = attackerData.kind || null;
      targetTypeForReturn = targetInfo.type || targetData.type || 'UNKNOWN';
      targetKindForReturn = targetData.kind || null;

      // Resolve attacker config based on stored entity doc (type/kind).
      const attackerDescriptor = attackerData.type
        ? attackerData
        : { type: 'PLAYER', kind: 'DEFAULT' };
      const attackerCfg = resolveEntityConfig(attackerDescriptor) || {};

      const apCost = overrideApCost ?? attackerCfg.attackApCost ?? 1;
      const damage = overrideDamage ?? attackerCfg.attackDamage ?? 1;

      // For now only gate AP for player attacks.
      const gateAp = true;
      const curAp = attackerData.ap ?? 0;
      if (gateAp && curAp < apCost) {
        throw new Error('attackEntity: not_enough_ap');
      }

      const newAp = gateAp ? Math.max(0, curAp - apCost) : curAp;

      const curHp = targetData.hp ?? 0;
      const newHp = Math.max(0, curHp - damage);

      const didHit = newHp < curHp;
      const isDead = newHp <= 0;

      // Track for return payload
      attackerHp = attackerData.hp ?? null;
      attackerAp = newAp;
      targetHp = newHp;

      damageForReturn = damage;
      hitForReturn = didHit;
      deadForReturn = isDead;

      const attackerWrite = {
        ...attackerData,
        ap: newAp,
        updatedAt: serverTs(),
      };

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
      attacker: {
        id: attackerId,
        type: attackerTypeForReturn,
        kind: attackerKindForReturn,
        hp: attackerHp,
        ap: attackerAp,
      },
      target: {
        id: targetId,
        type: targetTypeForReturn,
        kind: targetKindForReturn,
        hp: targetHp,
        dead: deadForReturn,
      },
      hit: hitForReturn,
      damage: damageForReturn,
      hpAfter: targetHp,
    };
  }

  /**
   * Legacy thin wrappers (still useful if anything calls them directly).
   * They now just delegate into the id-only attackEntity.
   */
  async function attackPlayer({
    gameId = 'lockdown2030',
    attackerUid,
    targetUid,
    damage,
    apCost,
  }) {
    return attackEntity({
      gameId,
      attackerId: attackerUid,
      targetId: targetUid,
      overrideDamage: damage,
      overrideApCost: apCost,
    });
  }

  async function attackZombie({
    gameId = 'lockdown2030',
    attackerUid,
    zombieId,
    damage,
    apCost,
  }) {
    return attackEntity({
      gameId,
      attackerId: attackerUid,
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