import { createDb } from '../db.js';
import { loadEnv } from '../env.js';

loadEnv();

async function main() {
  const db = await createDb();
  const count = await db.query<{ n: number }>('SELECT COUNT(*)::int AS n FROM users');
  const rows = await db.query<any>(
    'SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 8'
  );
  console.log('users count:', count[0]?.n);
  for (const r of rows) console.log(`  ${r.id}  ${r.email}`);
  await db.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
