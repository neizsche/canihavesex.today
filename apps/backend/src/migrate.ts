import type { Db } from './db.js';

export async function migrate(db: Db) {
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
    
    -- Waitlist (Legacy but harmless to keep if needed, or remove if truly scrubbing)
    create table if not exists waitlist (
      id uuid primary key default gen_random_uuid(),
      email text not null unique,
      source text,
      reason text,
      created_at timestamp with time zone default now()
    );
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

  console.log('[Migrate] Schema synced.');
}
