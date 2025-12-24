// ld2030/v1/engine/handlers/repair-handlers.js
// Repair handlers (V1): inside cell repairs.
// Thin handler: rules + atomic writes live in writer.repairCell().

function normalizePreferred(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (!s || s === 'auto') return null;
  if (!['fuse', 'water', 'generator', 'structure'].includes(s)) {
    throw new Error('REPAIR_CELL: preferred_invalid');
  }
  return s;
}

function makeRepairHandlers({ reader, writer } = {}) {
  if (!reader) throw new Error('repair-handlers: missing_reader');
  if (!writer || typeof writer.repairCell !== 'function') {
    throw new Error('repair-handlers: writer.repairCell required');
  }

  async function handleRepairCell({ uid, gameId = 'lockdown2030', preferred = null }) {
    const TAG = 'REPAIR_CELL';
    const actorId = String(uid || '').trim();
    const gId = String(gameId || '').trim() || 'lockdown2030';
    if (!actorId) throw new Error(`${TAG}: uid_required`);

    const pref = normalizePreferred(preferred);

    // writer is the source of truth (tx + invariants)
    return writer.repairCell({
      gameId: gId,
      actorId,
      preferred: pref,
    });
  }

  return { handleRepairCell };
}

module.exports = { makeRepairHandlers };