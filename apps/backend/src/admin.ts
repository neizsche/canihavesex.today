import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { loadEnv } from './env.js';

async function main() {
  loadEnv();
  const db = await createDb();
  await migrate(db);

  const limit = Number(process.env.ADMIN_LIMIT ?? 25);

  const users = await db.query<{ id: string; email: string; created_at?: string; createdAt?: string }>(
    'select id, email, created_at as "createdAt" from users order by created_at desc limit $1',
    [limit]
  );

  const cycles = await db.query<any>(
    'select id, user_id as "userId", start_date as "startDate", state, peak_date as "peakDate", temp_shift_confirmed_date as "tempShiftConfirmedDate", created_at as "createdAt" from cycles order by created_at desc limit $1',
    [limit]
  );

  const logs = await db.query<any>(
    'select id, user_id as "userId", cycle_id as "cycleId", date, mucus_type as "mucusType", sensation, bleeding, temperature, lh_test as "lhTest", created_at as "createdAt" from daily_logs order by date desc limit $1',
    [limit]
  );

  console.log('--- USERS ---');
  for (const u of users) console.log(`${u.id}  ${u.email}  ${u.createdAt ?? ''}`);

  console.log('\n--- CYCLES ---');
  for (const c of cycles)
    console.log(
      `${c.id} user=${c.userId} start=${c.startDate} state=${c.state} peak=${c.peakDate ?? '-'} tempShift=${c.tempShiftConfirmedDate ?? '-'} created=${c.createdAt ?? ''}`
    );

  console.log('\n--- LOGS ---');
  for (const l of logs)
    console.log(
      `${l.date} user=${l.userId} cycle=${l.cycleId} mucus=${l.mucusType} sensation=${l.sensation} bleeding=${l.bleeding} temp=${l.temperature ?? '-'} lh=${l.lhTest}`
    );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
