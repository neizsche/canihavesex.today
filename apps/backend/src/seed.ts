import { randomUUID } from 'node:crypto';
import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { loadEnv } from './env.js';

export async function seed() {
  loadEnv();
  const db = await createDb();
  await migrate(db);

  const now = new Date().toISOString();
  const userId = '00000000-0000-0000-0000-000000000001';
  const email = 'demo@example.com';

  await db.exec(
    `insert or ignore into users (id, email, created_at) values ('${userId}', '${email}', '${now}')`
  );

  const cycleId = '00000000-0000-0000-0000-000000000101';
  const cycleStart = isoDateOffset(-10);

  await db.exec(
    `insert or ignore into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at)
     values ('${cycleId}', '${userId}', '${cycleStart}', 'INFERTILE_PRE', null, null, '${now}')`
  );

  const logs = [
    { d: -10, mucus: 'light', m: 'dry', s: 'dry', lh: 'notTaken', t: null },
    { d: -9, mucus: 'none', m: 'sticky', s: 'damp', lh: 'notTaken', t: null },
    { d: -8, mucus: 'none', m: 'creamy', s: 'damp', lh: 'notTaken', t: 36.4 },
    { d: -7, mucus: 'none', m: 'watery', s: 'slippery', lh: 'negative', t: 36.5 },
    { d: -6, mucus: 'none', m: 'eggwhite', s: 'slippery', lh: 'positive', t: 36.5 },
    { d: -5, mucus: 'none', m: 'watery', s: 'slippery', lh: 'negative', t: 36.6 },
    { d: -4, mucus: 'none', m: 'creamy', s: 'damp', lh: 'notTaken', t: 36.8 },
    { d: -3, mucus: 'none', m: 'dry', s: 'dry', lh: 'notTaken', t: 36.9 },
    { d: -2, mucus: 'none', m: 'dry', s: 'dry', lh: 'notTaken', t: 37.0 },
  ] as const;

  for (const l of logs) {
    const id = randomUUID();
    const date = isoDateOffset(l.d);
    await db.exec(
      `insert or ignore into daily_logs
        (id, user_id, cycle_id, date, mucus_type, sensation, bleeding, temperature, lh_test, sick, bad_sleep, alcohol, created_at)
       values
        ('${id}', '${userId}', '${cycleId}', '${date}', '${l.m}', '${l.s}', '${l.mucus}', ${l.t === null ? 'null' : l.t}, '${l.lh}', 0, 0, 0, '${now}')`
    );
  }
}

function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
