import type { Db } from './db.js';

export async function migrate(db: Db) {
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

    create table if not exists cycles (
      id text primary key,
      user_id text not null,
      start_date text not null,
      state text not null,
      peak_date text,
      temp_shift_confirmed_date text,
      created_at text not null
    );

    create table if not exists daily_logs (
      id text primary key,
      user_id text not null,
      cycle_id text not null,
      date text not null,
      mucus_type text not null,
      sensation text not null,
      bleeding text not null,
      temperature real,
      lh_test text not null,
      sick integer not null default 0,
      bad_sleep integer not null default 0,
      alcohol integer not null default 0,
      created_at text not null,
      unique(user_id, date)
    );

    -- Append-only raw input events (source of truth)
    create table if not exists raw_logs (
      id text primary key,
      user_id text not null,
      date text not null,
      payload_json text not null,
      source text not null default 'app',
      created_at text not null
    );

    -- Latest normalized day snapshot (recomputable; safe to overwrite)
    create table if not exists normalized_days (
      id text primary key,
      user_id text not null,
      date text not null,
      cycle_start_date text not null,
      cycle_day_index integer not null,
      has_log integer not null default 0,
      bleeding text,
      mucus_type text,
      sensation text,
      temperature real,
      lh_test text,
      -- phase 1: additional raw fields (optional in UI today)
      sex integer,
      sleep_hours real,
      illness integer,
      stress integer,
      notes text,
      updated_at text not null,
      unique(user_id, date)
    );

    -- Versioned engine output + trace (never overwrite)
    create table if not exists engine_results (
      id text primary key,
      user_id text not null,
      cycle_id text not null,
      cycle_start_date text not null,
      as_of_date text not null,
      engine_version text not null,
      parameter_version text not null,
      input_hash text not null,
      output_json text not null,
      created_at text not null
    );

    create table if not exists engine_traces (
      id text primary key,
      engine_result_id text not null,
      trace_json text not null,
      created_at text not null
    );

    -- phase 2+: personalization + feedback scaffolding
    create table if not exists user_personal_model (
      user_id text primary key,
      mean_ovulation_day real,
      mean_luteal_length real,
      updated_at text not null
    );

    create table if not exists user_feedback (
      id text primary key,
      user_id text not null,
      date text not null,
      type text not null,
      payload_json text,
      created_at text not null
    );

    -- Critical performance indexes
    create index if not exists idx_users_email on users(email);
    create index if not exists idx_cycles_user_start_date on cycles(user_id, start_date desc);
    create index if not exists idx_cycles_user_created on cycles(user_id, created_at desc);
    create index if not exists idx_daily_logs_user_date on daily_logs(user_id, date desc);
    create index if not exists idx_daily_logs_cycle_date on daily_logs(cycle_id, date asc);
    create index if not exists idx_daily_logs_user_cycle on daily_logs(user_id, cycle_id);
    create index if not exists idx_user_identities_user on user_identities(user_id);

    create index if not exists idx_raw_logs_user_date_created on raw_logs(user_id, date asc, created_at asc);
    create index if not exists idx_normalized_days_user_cycle_date on normalized_days(user_id, cycle_start_date, date asc);
    create index if not exists idx_engine_results_user_cycle_asof on engine_results(user_id, cycle_id, as_of_date desc, created_at desc);
    create index if not exists idx_engine_traces_result on engine_traces(engine_result_id);
    create index if not exists idx_feedback_user_date on user_feedback(user_id, date desc);
  `);

  // Add onboarding columns to existing user_preferences tables
  // These will fail silently if columns already exist
  const alterCommands = [
    'alter table user_preferences add column intent text;',
    'alter table user_preferences add column cycle_regularity text;',
    'alter table user_preferences add column context_flags text;',
    'alter table user_preferences add column onboarding_completed_at text;',
    'alter table user_preferences add column education_global_shown_at text;',
    'alter table user_preferences add column education_mucus_shown_at text;',
    'alter table user_preferences add column education_bbt_shown_at text;',
    'alter table user_preferences add column education_lh_shown_at text;'
  ];

  for (const cmd of alterCommands) {
    try {
      await db.exec(cmd);
    } catch (e) {
      // Column already exists, ignore error
    }
  }
}
