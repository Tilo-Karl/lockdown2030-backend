#!/usr/bin/env node
/**
 * One-time migration script to enforce canonical durability fields on item docs.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrate-durability.js --game game123
 *   GOOGLE_APPLICATION_CREDENTIALS=... node scripts/migrate-durability.js --all
 *
 * Options:
 *   --game, -g   Comma-separated list of gameIds to migrate (default: all games)
 *   --dry-run    Scan only; log the docs that would change without writing
 */

const admin = require('firebase-admin');

const CURRENT_ALIASES = [
  'currentDurability',
  'durability_current',
  'durabilityRemaining',
  'itemDurability',
  'weaponDurability',
  'armorDurability',
];

const MAX_ALIASES = [
  'currentDurabilityMax',
  'maxDurability',
  'max_durability',
];

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { games: [], dryRun: false, all: false };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--game' || arg === '-g') {
      const val = args[i + 1];
      if (!val) throw new Error('Missing value for --game');
      opts.games.push(...val.split(',').map((x) => x.trim()).filter(Boolean));
      i += 1;
      continue;
    }
    if (arg === '--dry-run') {
      opts.dryRun = true;
      continue;
    }
    if (arg === '--all') {
      opts.all = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return opts;
}

function findFirstAlias(data, aliases) {
  for (const key of aliases) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return { key, value: data[key] };
    }
  }
  return null;
}

function buildDurabilityUpdate(data, FieldValue) {
  const patch = {};
  const deleteKeys = [];

  const currentAlias = findFirstAlias(data, CURRENT_ALIASES);
  if (currentAlias) {
    patch.durability = currentAlias.value;
    deleteKeys.push(currentAlias.key);
  }

  const maxAlias = findFirstAlias(data, MAX_ALIASES);
  if (maxAlias) {
    patch.durabilityMax = maxAlias.value;
    deleteKeys.push(maxAlias.key);
  }

  // Remove any lingering aliases even if they matched earlier entries.
  for (const alias of CURRENT_ALIASES) {
    if (Object.prototype.hasOwnProperty.call(data, alias) && alias !== currentAlias?.key) {
      deleteKeys.push(alias);
    }
  }
  for (const alias of MAX_ALIASES) {
    if (Object.prototype.hasOwnProperty.call(data, alias) && alias !== maxAlias?.key) {
      deleteKeys.push(alias);
    }
  }

  if (deleteKeys.length) {
    for (const key of deleteKeys) {
      patch[key] = FieldValue.delete();
    }
  }

  return patch;
}

async function migrateItemsCol({ db, gameId, dryRun }) {
  const itemsSnap = await db.collection('games').doc(gameId).collection('items').get();
  if (itemsSnap.empty) return { updated: 0 };

  let batch = db.batch();
  let pendingWrites = 0;
  let updated = 0;

  for (const doc of itemsSnap.docs) {
    const data = doc.data() || {};
    const patch = buildDurabilityUpdate(data, admin.firestore.FieldValue);
    if (!Object.keys(patch).length) continue;

    updated += 1;
    if (dryRun) {
      console.log(`[DRY RUN] ${gameId}/items/${doc.id} patch ->`, patch);
      continue;
    }

    batch.update(doc.ref, patch);
    pendingWrites += 1;
    if (pendingWrites >= 450) {
      await batch.commit();
      batch = db.batch();
      pendingWrites = 0;
    }
  }

  if (!dryRun && pendingWrites) {
    await batch.commit();
  }

  return { updated };
}

async function main() {
  const opts = parseArgs();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const db = admin.firestore();

  let gameIds = opts.games;
  if (!gameIds.length) {
    if (!opts.all) throw new Error('Specify --game <id> or --all');
    const gamesSnap = await db.collection('games').get();
    gameIds = gamesSnap.docs.map((d) => d.id);
  }

  if (!gameIds.length) {
    console.log('No games found to migrate.');
    return;
  }

  for (const gameId of gameIds) {
    console.log(`Migrating durability fields for game ${gameId}...`);
    const { updated } = await migrateItemsCol({ db, gameId, dryRun: opts.dryRun });
    console.log(`Game ${gameId}: ${updated} item docs updated.`);
  }

  if (opts.dryRun) {
    console.log('Dry run complete. Re-run without --dry-run to apply changes.');
  } else {
    console.log('Migration complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
