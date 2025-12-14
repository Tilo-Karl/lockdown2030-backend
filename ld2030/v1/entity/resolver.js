// ld2030/v1/entity/resolver.js
// Smart mapping: (type, kind) -> registry KEY
// PURE: no requires, no registry access.

function normalizeType(x) {
  return String(x || '').trim().toUpperCase();
}
function normalizeKind(x) {
  return String(x || 'DEFAULT').trim().toUpperCase();
}

function resolveEntityKey(type, kind) {
  const t = normalizeType(type);
  const k = normalizeKind(kind);

  if (t === 'HUMAN') {
    if (k === 'PLAYER')  return 'HUMAN_PLAYER';
    if (k === 'TRADER')  return 'HUMAN_TRADER';
    if (k === 'RAIDER')  return 'HUMAN_RAIDER';
    if (k === 'CIVILIAN' || k === 'DEFAULT') return 'HUMAN_CIVILIAN';
    return 'HUMAN_CIVILIAN';
  }

  if (t === 'ZOMBIE') {
    if (k === 'WALKER' || k === 'DEFAULT') return 'ZOMBIE_WALKER';
    if (k === 'RUNNER') return 'ZOMBIE_RUNNER';
    if (k === 'SMART')  return 'ZOMBIE_SMART';
    if (k === 'HULK')   return 'ZOMBIE_HULK';
    return 'ZOMBIE_WALKER';
  }

  if (t === 'ITEM') {
    // weapons
    if (k === 'CROSSBOW') return 'ITEM_WEAPON_CROSSBOW';
    if (k === 'PISTOL')   return 'ITEM_WEAPON_PISTOL';
    if (k === 'SHOTGUN')  return 'ITEM_WEAPON_SHOTGUN';
    if (k === 'RIFLE')    return 'ITEM_WEAPON_RIFLE';
    if (k === 'KNIFE')    return 'ITEM_WEAPON_KNIFE';
    if (k === 'BASEBALL_BAT') return 'ITEM_WEAPON_BAT';
    if (k === 'PIPE')     return 'ITEM_WEAPON_PIPE';
    if (k === 'MACHETE')  return 'ITEM_WEAPON_MACHETE';
    if (k === 'SPEAR')    return 'ITEM_WEAPON_SPEAR';

    // armor/clothing
    if (k === 'RIOT_VEST')        return 'ITEM_ARMOR_RIOT_VEST';
    if (k === 'MOTO_JACKET')      return 'ITEM_ARMOR_MOTORCYCLE_JACKET';
    if (k === 'BULLETPROOF_VEST') return 'ITEM_ARMOR_BULLETPROOF_VEST';
    if (k === 'WORK_GLOVES')      return 'ITEM_ARMOR_WORK_GLOVES';
    if (k === 'HELMET')           return 'ITEM_ARMOR_HELMET';
    if (k === 'HOODIE')           return 'ITEM_CLOTHING_HOODIE';
    if (k === 'DENIM_JACKET')     return 'ITEM_CLOTHING_DENIM_JACKET';
    if (k === 'BOOTS')            return 'ITEM_CLOTHING_BOOTS';

    // misc/tools/gear
    if (k === 'MEDKIT')              return 'ITEM_MED_MEDKIT';
    if (k === 'MRE')                 return 'ITEM_FOOD_MRE';
    if (k === 'TOOLKIT')             return 'ITEM_TOOL_TOOLKIT';
    if (k === 'LOCKPICK')            return 'ITEM_TOOL_LOCKPICK';
    if (k === 'GENERATOR_PORTABLE')  return 'ITEM_GEAR_PORTABLE_GENERATOR';

    // no “generic” unless you actually define it in registry
    return null;
  }

  return null;
}

function resolveEntityKeyFlexible(a, b) {
  if (a && typeof a === 'object') return resolveEntityKey(a.type, a.kind);
  if (typeof a === 'string' && typeof b === 'string') return resolveEntityKey(a, b);
  if (typeof a === 'string') return a; // assume it's already a key
  return null;
}

module.exports = {
  resolveEntityKey,
  resolveEntityKeyFlexible,
};