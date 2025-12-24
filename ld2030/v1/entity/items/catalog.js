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

const ITEM_BY_KIND = {};
for (const it of ALL_ITEMS) {
  if (!it || typeof it !== 'object') continue;
  const kind = String(it.kind || '').trim();
  if (!kind) continue;
  if (ITEM_BY_KIND[kind]) {
    throw new Error(`items/catalog: duplicate item kind: ${kind}`);
  }
  ITEM_BY_KIND[kind] = it;
}

function getItem(kind) {
  const k = String(kind || '').trim();
  const it = ITEM_BY_KIND[k];
  if (!it) throw new Error(`items/catalog: unknown item kind: ${k}`);
  return it;
}

module.exports = {
  ALL_ITEMS,
  ITEM_BY_KIND,
  getItem,
};