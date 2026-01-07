import { createDb } from './db.js';

export async function migrate() {
  const db = await createDb();

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
  `);
}
