// ld2030/v1/entity/base-entity.js

// Truly universal template fields only.
// NO runtime/world fields here (id/pos/createdAt/current values).
const BASE_ENTITY = {
  type: 'UNKNOWN',   // HUMAN | ZOMBIE | ITEM | ...
  kind: 'UNKNOWN',   // TRADER | WALKER | CROSSBOW | ...
  name: 'Unknown',
  tags: [],          // free-form: ['faction:neutral', 'ai:hostile', 'item:tool', ...]
};

module.exports = { BASE_ENTITY };