import { createDb } from '../db.js';
import { migrate } from '../migrate.js';
import { loadEnv } from '../env.js';

loadEnv();

// App-owned tables only. Supabase-managed schemas (auth, storage, etc.) are NOT touched.
const APP_TABLES = [
  // children first (FKs), though CASCADE handles ordering anyway
  'billing_events',
  'subscriptions',
  'email_verification_codes',
  'logs',
  'daily_status',
  'cycles',
  'active_cycles',     // legacy, merged into cycles
  'user_settings',     // merged preferences + metadata
  'user_preferences',  // legacy (pre-consolidation)
  'user_metadata',     // legacy (pre-consolidation)
  'user_identities',
  'waitlist',
  'users',
  // migration bookkeeping (+ its legacy predecessor) so migrate() re-applies
  'schema_migrations',
  'schema_meta',
];

async function reset() {
  if (process.env.RESET_DB_CONFIRM !== 'yes') {
    console.error('Refusing to run: set RESET_DB_CONFIRM=yes to drop all app tables.');
    process.exit(1);
  }

  const db = await createDb();
  console.log('[reset] Connected. Dropping app tables in public schema...');

  for (const t of APP_TABLES) {
    await db.exec(`DROP TABLE IF EXISTS "${t}" CASCADE`);
    console.log(`[reset]   dropped ${t}`);
  }

  console.log('[reset] Recreating schema via migrate()...');
  await migrate(db);

  // Sanity check: confirm tables exist and are empty
  const counts: Record<string, number> = {};
  for (const t of ['users', 'logs', 'cycles', 'user_settings']) {
    const rows = await db.query<{ n: string }>(`SELECT COUNT(*)::int AS n FROM "${t}"`);
    counts[t] = Number(rows[0]?.n ?? 0);
  }
  console.log('[reset] Done. Fresh row counts:', counts);

  await db.close();
}

reset().catch((err) => {
  console.error('[reset] FAILED:', err);
  process.exit(1);
});
