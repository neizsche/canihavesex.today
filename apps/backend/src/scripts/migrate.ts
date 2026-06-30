// Standalone migration runner.
//
// In managed cloud we run migrations as a discrete deploy step (see
// .github/workflows/deploy.yml) instead of on every server boot, so the app's
// cold-start path stays lean. Self-hosters still get auto-migrate on boot
// (see RUN_MIGRATIONS_ON_BOOT in index.ts) — this script is only for setups
// that opt out of boot migrations.
//
// Usage (against a built image / dist): node apps/backend/dist/scripts/migrate.js
//        (dev, from source):            tsx src/scripts/migrate.ts
import { createDb } from '../db.js';
import { migrate } from '../migrate.js';

async function main(): Promise<void> {
  const db = await createDb();
  try {
    await migrate(db);
    console.log('[migrate] up to date');
  } finally {
    await db.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] failed', err);
    process.exit(1);
  });
