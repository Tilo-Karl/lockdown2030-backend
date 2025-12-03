// ld2030/v1/engine/state-writer.js
// Centralized writes/mutations to Firestore.

const ZOMBIES = require('../npc/zombie-config');
const { PLAYER } = require('../config');

module.exports = function makeStateWriter({ db, admin, state }) {
  return {
    /** Move a player by (dx, dy) and stamp updatedAt. */
    async movePlayer(gameId, uid, dx, dy) {
      const ref = state.playersCol(gameId).doc(uid);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists
          ? snap.data()
          : {
              pos: { x: 0, y: 0 },
              hp: PLAYER.START_HP ?? 100,
              ap: PLAYER.START_AP ?? 3,
              alive: true,
            };

        const newX = (cur.pos?.x ?? 0) + Number(dx);
        const newY = (cur.pos?.y ?? 0) + Number(dy);

        tx.set(
          ref,
          {
            ...cur,
            pos: { x: newX, y: newY },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      return { ok: true };
    },

    /** Player vs player attack. AP-gated. */
    async attackPlayer({
      gameId = 'lockdown2030',
      attackerUid,
      targetUid,
      damage = PLAYER.ATTACK_DAMAGE ?? 10,
      apCost = PLAYER.ATTACK_AP_COST ?? 1,
    }) {
      if (!attackerUid || !targetUid) {
        throw new Error('attackPlayer: attackerUid and targetUid are required');
      }

      const players = state.playersCol(gameId);
      const attackerRef = players.doc(attackerUid);
      const targetRef = players.doc(targetUid);

      await db.runTransaction(async (tx) => {
        const [attSnap, tgtSnap] = await Promise.all([
          tx.get(attackerRef),
          tx.get(targetRef),
        ]);

        if (!attSnap.exists || !tgtSnap.exists) {
          throw new Error('attackPlayer: player_not_found');
        }

        const attacker = attSnap.data() || {};
        const target = tgtSnap.data() || {};

        const curAp = attacker.ap ?? 0;
        if (curAp < apCost) {
          throw new Error('attackPlayer: not_enough_ap');
        }

        const newAp = curAp - apCost;
        const curHp = target.hp ?? 0;
        const newHp = Math.max(0, curHp - damage);

        tx.set(
          attackerRef,
          {
            ...attacker,
            ap: newAp,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(
          targetRef,
          {
            ...target,
            hp: newHp,
            alive: newHp > 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      return { ok: true };
    },

    /** Player hits a zombie; zombie may bite back once as a reaction. */
    async attackZombie({
      gameId = 'lockdown2030',
      attackerUid,
      zombieId,
      damage = 10,
      apCost = 1,
    }) {
      if (!attackerUid || !zombieId) {
        throw new Error('attackZombie: attackerUid and zombieId are required');
      }

      const players = state.playersCol(gameId);
      const zombies = state.zombiesCol(gameId);
      const attackerRef = players.doc(attackerUid);
      const zombieRef = zombies.doc(zombieId);

      let finalZombieHp = null;
      let finalPlayerHp = null;
      let zombieDidHit = false;
      let zombieDamage = 0;

      await db.runTransaction(async (tx) => {
        const [attSnap, zomSnap] = await Promise.all([
          tx.get(attackerRef),
          tx.get(zombieRef),
        ]);

        if (!attSnap.exists) {
          throw new Error('attackZombie: attacker_not_found');
        }
        if (!zomSnap.exists) {
          throw new Error('attackZombie: zombie_not_found');
        }

        const attacker = attSnap.data() || {};
        const zombie = zomSnap.data() || {};

        const curAp = attacker.ap ?? 0;
        if (curAp < apCost) {
          throw new Error('attackZombie: not_enough_ap');
        }

        // 1) Player hits zombie
        const newAp = curAp - apCost;
        const curZombieHp = zombie.hp ?? 0;
        const newZombieHp = Math.max(0, curZombieHp - damage);
        finalZombieHp = newZombieHp;

        // 2) Zombie reaction (bite back) using config template
        const curPlayerHp = attacker.hp ?? 0;
        let newPlayerHp = curPlayerHp;

        const kindKey = (zombie.kind || 'WALKER').toUpperCase();
        const tmpl = ZOMBIES[kindKey] || ZOMBIES.WALKER;
        const bite = Number(tmpl.biteDamage ?? 0);
        const hitChance =
          typeof tmpl.hitChance === 'number' ? tmpl.hitChance : 1.0;

        if (newZombieHp > 0 && bite > 0 && hitChance > 0) {
          const roll = Math.random();
          if (roll <= hitChance) {
            zombieDidHit = true;
            zombieDamage = bite;
            newPlayerHp = Math.max(0, curPlayerHp - bite);
          }
        }

        finalPlayerHp = newPlayerHp;

        // Write attacker (AP always updated; HP only if changed)
        const attackerWrite = {
          ...attacker,
          ap: newAp,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (newPlayerHp !== curPlayerHp) {
          attackerWrite.hp = newPlayerHp;
          attackerWrite.alive = newPlayerHp > 0;
        }

        tx.set(attackerRef, attackerWrite, { merge: true });

        // Write zombie
        tx.set(
          zombieRef,
          {
            ...zombie,
            hp: newZombieHp,
            alive: newZombieHp > 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      return {
        ok: true,
        zombieHp: finalZombieHp,
        playerHp: finalPlayerHp,
        zombieDidHit,
        zombieDamage,
      };
    },

    /** Generic helper: merge data into a player doc. */
    async updatePlayer(gameId, uid, data) {
      await state.playersCol(gameId).doc(uid).set(
        {
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true };
    },

    /** Generic helper: merge data into a zombie doc. */
    async updateZombie(gameId, zombieId, data) {
      await state.zombiesCol(gameId).doc(zombieId).set(
        {
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true };
    },

    /** Merge game-level metadata into games/{gameId}. */
    async writeGameMeta(gameId, newMeta) {
      await state.gameRef(gameId).set(
        {
          ...newMeta,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { ok: true };
    },

    /**
     * Respawn zombies for a game based on a list of spawn specs.
     * Clears old zombies, then creates fresh ones based on ZOMBIES templates.
     */
    async spawnZombies(gameId, spawns) {
      if (!gameId) {
        throw new Error('spawnZombies: missing gameId');
      }

      const zombiesCol = state.zombiesCol(gameId);

      // Clear existing zombies for this game (fresh round)
      const existing = await zombiesCol.get();
      if (!existing.empty) {
        const delBatch = db.batch();
        existing.forEach((doc) => delBatch.delete(doc.ref));
        await delBatch.commit();
      }

      if (!Array.isArray(spawns) || spawns.length === 0) {
        return { ok: true, count: 0 };
      }

      const batch = db.batch();

      spawns.forEach((spawn) => {
        const x = Number(spawn.x);
        const y = Number(spawn.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return;
        }

        const kindKey = (spawn.kind || 'WALKER').toUpperCase();
        const tmpl = ZOMBIES[kindKey] || ZOMBIES.WALKER;

        const ref = zombiesCol.doc();
        batch.set(ref, {
          type: tmpl.type || 'ZOMBIE',
          kind: tmpl.kind || 'walker',
          hp: tmpl.baseHp ?? 60,
          alive: true,
          pos: { x, y },
          spawnedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      return { ok: true, count: spawns.length };
    },
  };
};