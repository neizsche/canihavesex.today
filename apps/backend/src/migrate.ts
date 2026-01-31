import type { Db } from './db.js';

export async function migrate(db: Db) {
  // 0. Cleanup Unused Tables
  // NOTE: Disabled by default to avoid destructive drops on startup.
  // If needed, re-enable via a one-time maintenance script or env-gated path.
  // await cleanupLegacyTables(db);

  // 1. Core User Tables
  await db.exec(`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      created_at text not null
    );

    create table if not exists user_identities (
      id text primary key,
      user_id text not null,
      provider text not null,
      provider_user_id text not null,
      email text,
      created_at text not null,
      unique(provider, provider_user_id)
    );

    create table if not exists user_preferences (
      user_id text primary key,
      theme text not null default 'dark',
      intent text,
      cycle_regularity text,
      context_flags text,
      onboarding_completed_at text,
      education_global_shown_at text,
      education_mucus_shown_at text,
      education_bbt_shown_at text,
      education_lh_shown_at text,
      updated_at text not null
    );

    create table if not exists user_api_keys (
      id uuid primary key,
      user_id uuid not null,
      name text,
      key_hash text not null unique,
      key_prefix text not null,
      created_at timestamp not null,
      last_used_at timestamp,
      revoked_at timestamp
    );
    
    -- Waitlist (Legacy but harmless to keep if needed, or remove if truly scrubbing)
    create table if not exists waitlist (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      source text,
      reason text,
      created_at timestamp with time zone default now()
    );
  `);

  await db.exec(`
    create index if not exists idx_user_api_keys_user_id on user_api_keys (user_id);
    create index if not exists idx_user_api_keys_hash on user_api_keys (key_hash);
  `);

  // 2. V5 Engine Tables (Promoted to Primary)
  // We keep the _v2 suffix in SQL for now to avoid data migration complexity during this cleanup,
  // or we could rename them if we wanted a hard break.
  // For safety/continuity of the CURRENT data, we keep the schema referencing logs_v2 etc.

  await db.exec(`
      CREATE TABLE IF NOT EXISTS logs_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        bleeding TEXT,
        temperature DECIMAL(5,2),
        mucus TEXT,
        lh_test TEXT,
        disturbances JSONB DEFAULT '[]',
        symptoms JSONB DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS cycles_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        ovulation_prediction DATE,
        ovulation_confirmed_date DATE,
        length INTEGER,
        period_length INTEGER,
        analysis_flags JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS active_cycles_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE,
        ovulation_prediction DATE,
        ovulation_confirmed_date DATE,
        length INTEGER,
        period_length INTEGER,
        analysis_flags JSONB DEFAULT '[]'
      );

      CREATE TABLE IF NOT EXISTS daily_status_v2 (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        date DATE NOT NULL,
        fertility_status TEXT NOT NULL,
        phase TEXT NOT NULL,
        is_predicted BOOLEAN NOT NULL,
        insights_payload JSONB NOT NULL,
        engine_version TEXT NOT NULL,
        updated_at TIMESTAMP,
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS user_meta_v2 (
        user_id UUID PRIMARY KEY,
        app_mode TEXT DEFAULT 'prevent',
        baseline_temp_avg DECIMAL(5,2) DEFAULT 36.5,
        avg_cycle_length DECIMAL(5,2) DEFAULT 28.0
      );
  `);

  await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_logs_v2_user_updated_at
        ON logs_v2 (user_id, updated_at DESC);

      CREATE INDEX IF NOT EXISTS idx_cycles_v2_user_start_date
        ON cycles_v2 (user_id, start_date DESC);
  `);

  console.log('[Migrate] Schema synced.');
}

async function cleanupLegacyTables(db: Db) {
  const ALLOWED_TABLES = new Set([
    'users',
    'user_identities',
    'user_preferences',
    'waitlist',
    'logs_v2',
    'cycles_v2',
    'active_cycles_v2',
    'daily_status_v2',
    'user_meta_v2'
  ]);

  const rows = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );

  for (const row of rows) {
    if (!ALLOWED_TABLES.has(row.tablename)) {
      console.log(`[Cleanup] Dropping unused table: ${row.tablename}`);
      await db.exec(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
    }
  }
}
