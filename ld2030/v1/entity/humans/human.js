// ld2030/v1/entity/humans/human.js

const { BASE_ACTOR } = require('../base-actor');

// 3 humans: PLAYER, TRADER, RAIDER
const HUMAN_PLAYER = {
  ...BASE_ACTOR,
  type: 'HUMAN',
  kind: 'PLAYER',
  name: 'Survivor',
  tags: ['faction:survivor'],

  maxHp: 100,
  maxAp: 3,
  attackDamage: 10,
  hitChance: 0.9,
  carryCap: 20,
};

const HUMAN_TRADER = {
  ...BASE_ACTOR,
  type: 'HUMAN',
  kind: 'TRADER',
  name: 'Trader',
  tags: ['faction:neutral', 'ai:passive'],

  maxHp: 80,
  maxAp: 2,
  attackDamage: 4,
  hitChance: 0.65,
  carryCap: 25,
};

const HUMAN_RAIDER = {
  ...BASE_ACTOR,
  type: 'HUMAN',
  kind: 'RAIDER',
  name: 'Raider',
  tags: ['faction:raiders', 'ai:hostile'],

  maxHp: 90,
  maxAp: 3,
  attackDamage: 12,
  hitChance: 0.75,
  armor: 1,
  carryCap: 15,
};

const HUMAN_CIVILIAN = {
  ...BASE_ACTOR,
  type: 'HUMAN',
  kind: 'CIVILIAN',
  name: 'Civilian',
  tags: ['faction:neutral', 'ai:passive'],

  maxHp: 70,
  maxAp: 2,
  attackDamage: 3,
  hitChance: 0.55,
  carryCap: 15,
};

module.exports = {
  HUMAN_PLAYER,
  HUMAN_TRADER,
  HUMAN_RAIDER,
  HUMAN_CIVILIAN,
};