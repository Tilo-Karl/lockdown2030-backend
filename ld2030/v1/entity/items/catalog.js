// ld2030/v1/entity/items/catalog.js
// Single registry for item templates (search/loot/spawn uses this).

const misc = require('./item');
const armor = require('./armor');
const weapon = require('./weapon');

const ALL_ITEMS = [
  ...Object.values(misc),
  ...Object.values(armor),
  ...Object.values(weapon),
];

const ITEM_BY_KIND = Object.fromEntries(ALL_ITEMS.map(it => [it.kind, it]));

function getItem(kind) {
  const it = ITEM_BY_KIND[kind];
  if (!it) throw new Error(`items/catalog: unknown item kind: ${kind}`);
  return it;
}

module.exports = {
  ALL_ITEMS,
  ITEM_BY_KIND,
  getItem,
};