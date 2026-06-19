import type { Db } from './db.js';

// Bump this whenever the schema below changes (new table/column/index/trigger).
// Boot compares it against the stored version and skips the full DDL pass when
// the DB is already at this version — turning ~9 round-trips into 2 on warm
// starts. Forgetting to bump means a schema change won't apply, so increment it
// alongside any edit to the migration body.
const SCHEMA_VERSION = 1;

export async function migrate(db: Db) {
  // --- Fast path: skip the full migration when the DB is already current ---
  // A single-row meta table records the applied schema version. On an
  // up-to-date database this costs two cheap round-trips instead of replaying
  // every idempotent CREATE/ALTER, which is the bulk of cold-start latency.
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      id INTEGER PRIMARY KEY DEFAULT 1,
      version INTEGER NOT NULL,
      CONSTRAINT schema_meta_singleton CHECK (id = 1)
    );
  `);

  const versionRows = await db.query<{ version: number }>(
    `SELECT version FROM schema_meta WHERE id = 1`
  );
  if (versionRows.length > 0 && versionRows[0].version >= SCHEMA_VERSION) {
    return;
  }

  // --- 0. Helper Functions & Extensions ---
  await db.exec(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // --- 1. Clean Slate (Destroy Legacy Tables) ---
  // The user explicitly requested to destroy all current data and start fresh.
  const legacyTables = [
    'users_legacy', 'user_identities_legacy', 'user_preferences_legacy', 'user_api_keys_legacy',
    'logs_v2', 'cycles_v2', 'active_cycles_v2', 'daily_status_v2', 'user_meta_v2',
    'logs_v2_legacy', 'cycles_v2_legacy', 'active_cycles_v2_legacy', 'daily_status_v2_legacy', 'user_meta_v2_legacy',
    'waitlist_legacy'
  ];

  for (const t of legacyTables) {
    await db.exec(`DROP TABLE IF EXISTS "${t}" CASCADE`).catch(() => {});
  }

  // Also drop core tables if they are still using the old 'TEXT' ID schema.
  // DESTRUCTIVE: this wipes ALL user data. It is gated behind an explicit
  // opt-in flag so it never runs on a normal self-hosted install or upgrade.
  if (process.env.MIGRATE_ALLOW_DESTRUCTIVE === '1') {
    const checkUsers = await db.query<{ data_type: string }>(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'id' LIMIT 1`
    );

    if (checkUsers.length > 0 && checkUsers[0].data_type === 'text') {
        console.log('[Migrate] Legacy TEXT schema detected in "users" table. Dropping for fresh UUID start...');
        const coreTables = ['users', 'user_identities', 'user_preferences', 'user_api_keys', 'waitlist', 'cycles', 'active_cycles', 'daily_status', 'logs'];
        for (const t of coreTables) {
            await db.exec(`DROP TABLE IF EXISTS "${t}" CASCADE`).catch(() => {});
        }
    }
  }

  // Ensure 'cycles' table is updated if it exists from a previous v5 run
  await db.exec(`
    DO $$ 
    BEGIN 
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cycles') THEN
        ALTER TABLE cycles ALTER COLUMN end_date DROP NOT NULL;
      END IF;
      -- Drop active_cycles if it exists (now merged into cycles)
      DROP TABLE IF EXISTS active_cycles CASCADE;
    END $$;
  `).catch(() => {});

  // --- 2. Canonical Production Tables ---

  await db.exec(`
    -- Core User Tables
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Email + password login. Nullable: a user may sign in via OAuth only.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

    CREATE TABLE IF NOT EXISTS user_identities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_user_id)
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT NOT NULL DEFAULT 'dark',
      intent TEXT,
      cycle_regularity TEXT,
      context_flags JSONB DEFAULT '[]',
      onboarding_completed_at TIMESTAMPTZ,
      education_global_shown_at TIMESTAMPTZ,
      education_mucus_shown_at TIMESTAMPTZ,
      education_bbt_shown_at TIMESTAMPTZ,
      education_lh_shown_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_api_keys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_used_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );

    -- Physiological Data Tables
    CREATE TABLE IF NOT EXISTS logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      bleeding TEXT,
      temperature DECIMAL(5,2),
      mucus TEXT,
      lh_test TEXT,
      disturbances JSONB DEFAULT '[]',
      symptoms JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS cycles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE, -- NULL means active cycle
      ovulation_prediction DATE,
      ovulation_confirmed_date DATE,
      length INTEGER,
      period_length INTEGER,
      analysis_flags JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS daily_status (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      fertility_status TEXT NOT NULL,
      phase TEXT NOT NULL,
      is_predicted BOOLEAN NOT NULL,
      insights_payload JSONB NOT NULL,
      engine_version TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS user_metadata (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      app_mode TEXT DEFAULT 'prevent',
      baseline_temp_avg DECIMAL(5,2) DEFAULT 36.5,
      avg_cycle_length DECIMAL(5,2) DEFAULT 28.0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Waitlist
    CREATE TABLE IF NOT EXISTS waitlist (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT NOT NULL UNIQUE,
      source TEXT,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // --- 2b. Schema Additions (Additive Migrations) ---
  // Discreet Mode: hide NSFW branding in header/about
  await db.exec(`
    ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS show_branding BOOLEAN NOT NULL DEFAULT true;
  `);

  // --- 3. Triggers for updated_at ---
  const tablesWithUpdatedAt = [
    'user_preferences',
    'logs',
    'cycles',
    'daily_status',
    'user_metadata'
  ];

  for (const table of tablesWithUpdatedAt) {
    await db.exec(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_updated_at_${table}') THEN
          CREATE TRIGGER trg_update_updated_at_${table}
          BEFORE UPDATE ON ${table}
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);
  }

  // --- 4. Indexes ---
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs (user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_cycles_user_start ON cycles (user_id, start_date DESC);
    -- Enforce only one active cycle per user
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cycles_user_active ON cycles (user_id) WHERE end_date IS NULL;
    CREATE INDEX IF NOT EXISTS idx_daily_status_user_date ON daily_status (user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_api_keys_hash ON user_api_keys (key_hash);
  `);

  // Record the applied version so subsequent boots take the fast path above.
  await db.exec(`
    INSERT INTO schema_meta (id, version) VALUES (1, ${SCHEMA_VERSION})
    ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version;
  `);

  console.log('[Migrate] Production schema created (Clean Start).');
}
