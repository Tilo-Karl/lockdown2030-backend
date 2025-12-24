// ld2030/v1/chat/chat-constants.js
// Shared constants + helpers for chat scopes/feed limits.

const CHAT_MAX_KEEP = 100;
const CHAT_DEFAULT_LIMIT = 25;
const CHAT_MAX_LIMIT = 100;

function normalizeScope(scope) {
  const s = String(scope || '').trim();
  return s || 'global';
}

function scopeGlobal() {
  return 'global';
}

function scopeForDistrict(districtId) {
  const id = String(districtId || '').trim();
  if (!id) throw new Error('chat: district_required');
  return `district:${id}`;
}

function scopeForDm(uidA, uidB) {
  const a = String(uidA || '').trim();
  const b = String(uidB || '').trim();
  if (!a || !b) throw new Error('chat: dm_uids_required');
  const [left, right] = [a, b].sort();
  return `dm:${left}:${right}`;
}

module.exports = {
  CHAT_MAX_KEEP,
  CHAT_DEFAULT_LIMIT,
  CHAT_MAX_LIMIT,
  normalizeScope,
  scopeGlobal,
  scopeForDistrict,
  scopeForDm,
};
