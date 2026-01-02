// ld2030/v1/entity/base-entity.js
// Shared template identity. Never include runtime fields here.

const BASE_ENTITY = {
  // ---------------------------------------------------------------------------
  // BASE_ENTITY — identity
  // ---------------------------------------------------------------------------
  type: 'UNKNOWN',   // HUMAN | ZOMBIE | ITEM | ...
  kind: 'UNKNOWN',   // TRADER | WALKER | CROSSBOW | ...
  name: 'Unknown',
  description: '',
  tags: [],          // free-form: ['faction:neutral', 'ai:hostile', 'item:tool', ...]
};

module.exports = { BASE_ENTITY };
