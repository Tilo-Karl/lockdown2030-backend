// ld2030/v1/engine/state-writer.js
// Centralized writes/mutations to Firestore.

const ZOMBIES = require('../npc/zombie-config');

module.exports = function makeStateWriter({ db, admin, state }) {
  return {
    async movePlayer(gameId, uid, dx, dy) {
      const ref = state.playersCol(gameId).doc(uid);

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const cur = snap.exists
          ? snap.data()
          : { pos: { x: 0, y: 0 }, hp: 100, ap: 3, alive: true };

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

    async attackPlayer({ gameId = 'lockdown2030', attackerUid, targetUid, damage = 10, apCost = 1 }) {
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

    async attackZombie({ gameId = 'lockdown2030', attackerUid, zombieId, damage = 10, apCost = 1 }) {
      if (!attackerUid || !zombieId) {
        throw new Error('attackZombie: attackerUid and zombieId are required');
      }

      const players = state.playersCol(gameId);
      const zombies = state.zombiesCol(gameId);
      const attackerRef = players.doc(attackerUid);
      const zombieRef = zombies.doc(zombieId);

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

        const newAp = curAp - apCost;
        const curHp = zombie.hp ?? 0;
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
          zombieRef,
          {
            ...zombie,
            hp: newHp,
            alive: newHp > 0,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      return { ok: true };
    },

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
          ap: tmpl.baseAp ?? 0,
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