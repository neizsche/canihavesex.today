import { randomUUID } from 'node:crypto';
import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { loadEnv } from './env.js';

type IsoDate = string;

function isoDateFrom(start: IsoDate, offsetDays: number): IsoDate {
  const d = new Date(start + 'T00:00:00Z');
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isoToday(): IsoDate {
  return new Date().toISOString().slice(0, 10);
}

function parseArgValue(args: string[], name: string): string | null {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  const v = args[idx + 1];
  if (!v || v.startsWith('--')) return null;
  return v;
}

function p(n: number): string {
  return `$${n}`;
}

export async function seedPerfect() {
  loadEnv();
  const db = await createDb();
  await migrate(db);

  const now = new Date().toISOString();

  const argv = process.argv.slice(2);
  const email =
    parseArgValue(argv, '--email') ??
    process.env.SEED_EMAIL ??
    'perfect-scenario@example.com';

  // Email is the key: create user if missing, otherwise reuse existing id.
  const existing = await db.query<{ id: string }>(
    `select id from users where email = ${p(1)} limit 1`,
    [email]
  );
  const userId = existing[0]?.id ?? randomUUID();
  if (!existing[0]?.id) {
    await db.query(
      `insert into users (id, email, created_at) values (${p(1)}, ${p(2)}, ${p(3)})`,
      [userId, email, now]
    );
  }

  // Put the cycle in the recent past so /api/today has enough data to confirm BBT.
  // Cycle day 1 will be startDate; we seed through CD16 inclusive.
  const startDate = isoDateFrom(isoToday(), -20);

  // Optional: give a personal model so calendar prior is stable.
  await db.query(
    `insert into user_personal_model (user_id, mean_ovulation_day, mean_luteal_length, updated_at)
     values (${p(1)}, 14.0, 14.0, ${p(2)})
     on conflict (user_id) do update set
       mean_ovulation_day=excluded.mean_ovulation_day,
       mean_luteal_length=excluded.mean_luteal_length,
       updated_at=excluded.updated_at`,
    [userId, now]
  );

  // “Perfect” logging: full coverage, one LH+, one eggwhite peak, and a clear BBT shift.
  // Requirements for BBT confirmation in CIHS:
  // - 6 reliable prior temps
  // - next 3 temps reliable
  // - ≥2 of next3 ≥ baseline+0.2°C
  const logs: Array<{
    cd: number;
    mucusType: 'dry' | 'sticky' | 'creamy' | 'watery' | 'eggwhite';
    sensation: 'dry' | 'damp' | 'slippery';
    bleeding: 'none' | 'spotting' | 'light' | 'heavy';
    temperature: number | null;
    lhTest: 'positive' | 'negative' | 'notTaken';
  }> = [
    // CD1..CD5 (early cycle)
    { cd: 1, bleeding: 'light', mucusType: 'dry', sensation: 'dry', lhTest: 'notTaken', temperature: 36.45 },
    { cd: 2, bleeding: 'light', mucusType: 'dry', sensation: 'dry', lhTest: 'notTaken', temperature: 36.42 },
    { cd: 3, bleeding: 'spotting', mucusType: 'dry', sensation: 'dry', lhTest: 'notTaken', temperature: 36.44 },
    { cd: 4, bleeding: 'none', mucusType: 'sticky', sensation: 'damp', lhTest: 'notTaken', temperature: 36.46 },
    { cd: 5, bleeding: 'none', mucusType: 'sticky', sensation: 'damp', lhTest: 'notTaken', temperature: 36.43 },

    // CD6..CD12 (fertile buildup + reliable baseline temps)
    { cd: 6, bleeding: 'none', mucusType: 'creamy', sensation: 'damp', lhTest: 'notTaken', temperature: 36.47 },
    { cd: 7, bleeding: 'none', mucusType: 'creamy', sensation: 'damp', lhTest: 'negative', temperature: 36.48 },
    { cd: 8, bleeding: 'none', mucusType: 'watery', sensation: 'slippery', lhTest: 'negative', temperature: 36.49 },
    { cd: 9, bleeding: 'none', mucusType: 'watery', sensation: 'slippery', lhTest: 'negative', temperature: 36.50 },
    { cd: 10, bleeding: 'none', mucusType: 'eggwhite', sensation: 'slippery', lhTest: 'negative', temperature: 36.51 },
    { cd: 11, bleeding: 'none', mucusType: 'eggwhite', sensation: 'slippery', lhTest: 'positive', temperature: 36.52 },
    { cd: 12, bleeding: 'none', mucusType: 'watery', sensation: 'slippery', lhTest: 'negative', temperature: 36.50 },

    // CD13 is “shift day” anchor; CD14-16 are elevated (confirm)
    { cd: 13, bleeding: 'none', mucusType: 'creamy', sensation: 'damp', lhTest: 'negative', temperature: 36.55 },
    { cd: 14, bleeding: 'none', mucusType: 'dry', sensation: 'dry', lhTest: 'notTaken', temperature: 36.76 },
    { cd: 15, bleeding: 'none', mucusType: 'dry', sensation: 'dry', lhTest: 'notTaken', temperature: 36.80 },
    { cd: 16, bleeding: 'none', mucusType: 'dry', sensation: 'dry', lhTest: 'notTaken', temperature: 36.82 },
  ];

  // Idempotency: if you re-run with the same email/user, replace prior seeded logs.
  await db.query(
    `delete from raw_logs where user_id = ${p(1)} and source = ${p(2)}`,
    [userId, 'seedPerfect']
  );

  // Insert append-only raw logs. We don’t touch daily_logs directly; the backend engine will maintain compat tables.
  // created_at increases to preserve deterministic ordering.
  for (let i = 0; i < logs.length; i++) {
    const l = logs[i]!;
    const date = isoDateFrom(startDate, l.cd - 1);
    const createdAt = new Date(Date.now() + i).toISOString();
    const id = randomUUID();
    const payload = {
      mucusType: l.mucusType,
      sensation: l.sensation,
      bleeding: l.bleeding,
      temperature: l.temperature,
      lhTest: l.lhTest,
      // optional quality/confounders: keep “perfect”
      fever: false,
      lateNight: false,
      measuredLate: false,
      semenExposure: false,
      infection: false,
      alcohol: false,
      illness: false,
      sleepHours: 8,
    };
    await db.query(
      `insert into raw_logs (id, user_id, date, payload_json, source, created_at)
       values (${p(1)}, ${p(2)}, ${p(3)}, ${p(4)}, ${p(5)}, ${p(6)})`,
      [id, userId, date, JSON.stringify(payload), 'seedPerfect', createdAt]
    );
  }

  // Helpful print for dev usage
  // eslint-disable-next-line no-console
  console.log('[seedPerfect] Seeded user:', { userId, email, startDate, days: logs.length });
  // eslint-disable-next-line no-console
  console.log(
    '[seedPerfect] Tip: in dev you can set cookie "uid" (signed in prod, unsigned in dev tools) to this userId to view the seeded data.'
  );
}

// Allow `tsx src/seedPerfect.ts` execution
if (process.argv[1]?.endsWith('seedPerfect.ts')) {
  seedPerfect().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
}

