// ld2030/v1/engine/state-writer-equipment.js

const {
  equip,
  unequip,
  computeDerivedStats,
} = require('./equipment-rules');

module.exports = function makeEquipmentWriter({ db, admin, state, reader }) {
  const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

  async function equipItem({ gameId, actorId, itemId }) {
    const actorRef = state.playersCol(gameId).doc(actorId);
    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      const actorSnap = await tx.get(actorRef);
      const itemSnap = await tx.get(itemRef);

      if (!actorSnap.exists || !itemSnap.exists) {
        throw new Error('equipItem: missing_actor_or_item');
      }

      const actor = actorSnap.data();
      const item = itemSnap.data();

      const newEquipment = equip(actor, item, itemId);

      tx.set(actorRef, {
        equipment: newEquipment,
        updatedAt: serverTs(),
      }, { merge: true });
    });

    return { ok: true };
  }

  async function unequipItem({ gameId, actorId, itemId }) {
    const actorRef = state.playersCol(gameId).doc(actorId);
    const itemRef = state.itemsCol(gameId).doc(itemId);

    await db.runTransaction(async (tx) => {
      const actorSnap = await tx.get(actorRef);
      const itemSnap = await tx.get(itemRef);

      if (!actorSnap.exists || !itemSnap.exists) {
        throw new Error('unequipItem: missing_actor_or_item');
      }

      const actor = actorSnap.data();
      const item = itemSnap.data();

      const newEquipment = unequip(actor, item);

      tx.set(actorRef, {
        equipment: newEquipment,
        updatedAt: serverTs(),
      }, { merge: true });
    });

    return { ok: true };
  }

  return {
    equipItem,
    unequipItem,
  };
};