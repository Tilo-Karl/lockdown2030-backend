// ld2030/v1/entity/registry.js
// Dumb dictionary: KEY -> template config

const humans = require('./humans/human');
const zombies = require('./zombies/zombie');

const item = require('./items/item');
const weapon = require('./items/weapon');
const armor = require('./items/armor');

const ENTITY_CONFIG = {
  // Humans
  HUMAN_PLAYER: humans.HUMAN_PLAYER,
  HUMAN_TRADER: humans.HUMAN_TRADER,
  HUMAN_RAIDER: humans.HUMAN_RAIDER,
  HUMAN_CIVILIAN: humans.HUMAN_CIVILIAN,

  // Zombies
  ZOMBIE_WALKER: zombies.ZOMBIE_WALKER,
  ZOMBIE_RUNNER: zombies.ZOMBIE_RUNNER,
  ZOMBIE_SMART: zombies.ZOMBIE_SMART,
  ZOMBIE_HULK: zombies.ZOMBIE_HULK,

  // Items (misc/tools/gear/consumables)
  ITEM_MED_MEDKIT: item.ITEM_MED_MEDKIT,
  ITEM_FOOD_MRE: item.ITEM_FOOD_MRE,
  ITEM_TOOL_TOOLKIT: item.ITEM_TOOL_TOOLKIT,
  ITEM_TOOL_LOCKPICK: item.ITEM_TOOL_LOCKPICK,
  ITEM_GEAR_PORTABLE_GENERATOR: item.ITEM_GEAR_PORTABLE_GENERATOR,

  // Weapons
  ITEM_WEAPON_CROSSBOW: weapon.ITEM_WEAPON_CROSSBOW,
  ITEM_WEAPON_PISTOL: weapon.ITEM_WEAPON_PISTOL,
  ITEM_WEAPON_SHOTGUN: weapon.ITEM_WEAPON_SHOTGUN,
  ITEM_WEAPON_RIFLE: weapon.ITEM_WEAPON_RIFLE,
  ITEM_WEAPON_KNIFE: weapon.ITEM_WEAPON_KNIFE,
  ITEM_WEAPON_BAT: weapon.ITEM_WEAPON_BAT,
  ITEM_WEAPON_PIPE: weapon.ITEM_WEAPON_PIPE,
  ITEM_WEAPON_MACHETE: weapon.ITEM_WEAPON_MACHETE,
  ITEM_WEAPON_SPEAR: weapon.ITEM_WEAPON_SPEAR,

  // Armor / clothing
  ITEM_ARMOR_RIOT_VEST: armor.ITEM_ARMOR_RIOT_VEST,
  ITEM_ARMOR_MOTORCYCLE_JACKET: armor.ITEM_ARMOR_MOTORCYCLE_JACKET,
  ITEM_ARMOR_BULLETPROOF_VEST: armor.ITEM_ARMOR_BULLETPROOF_VEST,
  ITEM_ARMOR_WORK_GLOVES: armor.ITEM_ARMOR_WORK_GLOVES,
  ITEM_ARMOR_HELMET: armor.ITEM_ARMOR_HELMET,

  ITEM_CLOTHING_HOODIE: armor.ITEM_CLOTHING_HOODIE,
  ITEM_CLOTHING_DENIM_JACKET: armor.ITEM_CLOTHING_DENIM_JACKET,
  ITEM_CLOTHING_BOOTS: armor.ITEM_CLOTHING_BOOTS,
};

function getEntityConfig(key) {
  return ENTITY_CONFIG[key] || null;
}

function getEntityConfigOrThrow(key) {
  const cfg = ENTITY_CONFIG[key];
  if (!cfg) throw new Error(`Unknown entity config key: ${key}`);
  return cfg;
}

module.exports = {
  ENTITY_CONFIG,
  getEntityConfig,
  getEntityConfigOrThrow,
};