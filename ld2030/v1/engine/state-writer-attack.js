// ld2030/v1/engine/state-writer-attack.js
// Unified attack path: id-only. NO legacy wrappers. Uses currentHp/currentAp or currentDurability.

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
      state.npcsCol(gameId),
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

      // Must exist on docs in new system
      const aType = String(attacker.type || '').toUpperCase();
      const aKind = String(attacker.kind || '').toUpperCase();
      const tType = String(target.type || '').toUpperCase();
      const tKind = String(target.kind || '').toUpperCase();

      if (!aType || !aKind) throw new Error('attackEntity: attacker_missing_type_or_kind');
      if (!tType || !tKind) throw new Error('attackEntity: target_missing_type_or_kind');

      const attackerCfg = resolveEntityConfig(aType, aKind) || {};
      const apCost = overrideApCost ?? attackerCfg.attackApCost ?? 1;
      const damage = overrideDamage ?? attackerCfg.attackDamage ?? 1;

      const gateAp = attacker.isPlayer === true;
      const curAp = Number.isFinite(attacker.currentAp) ? attacker.currentAp : 0;

      if (gateAp && curAp < apCost) throw new Error('attackEntity: not_enough_ap');

      const nextAp = gateAp ? Math.max(0, curAp - apCost) : curAp;

      // Apply damage to actors vs items
      let targetWrite = { updatedAt: serverTs() };

      if (tType === 'ITEM') {
        const destructible = target.destructible !== false;
        const curDur = Number.isFinite(target.currentDurability) ? target.currentDurability : 0;

        if (!destructible) {
          // no-op (still spend AP if player attacked)
          targetWrite = { updatedAt: serverTs() };
        } else {
          const nextDur = Math.max(0, curDur - damage);
          targetWrite.currentDurability = nextDur;
          targetWrite.broken = nextDur <= 0;
        }
      } else {
        const alive = target.alive !== false;
        if (!alive) throw new Error('attackEntity: target_dead');

        const curHp = Number.isFinite(target.currentHp) ? target.currentHp : 0;
        const nextHp = Math.max(0, curHp - damage);

        targetWrite.currentHp = nextHp;
        targetWrite.alive = nextHp > 0;
        if (nextHp <= 0) targetWrite.downed = true; // optional; you already have downed in BASE_ACTOR
      }

      // Attacker write (AP)
      const attackerWrite = {
        updatedAt: serverTs(),
      };
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