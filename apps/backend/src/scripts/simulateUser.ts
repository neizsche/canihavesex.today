import { createDb } from '../db.js';
import { migrate } from '../migrate.js';
import { LogRepository, Log } from '../repositories/LogRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { runFusionEngine } from '../engine.js';
import { randomUUID } from 'node:crypto';
import { addDaysIso, isoToday } from '../utils/dates.js';
import { loadEnv } from '../env.js';

loadEnv();

async function simulate() {
  const db = await createDb();
  await migrate(db);

  const logRepo = new LogRepository(db);
  const settingsRepo = new SettingsRepository(db);
  const cycleRepo = new CycleRepository(db);
  const statusRepo = new DailyStatusRepository(db);

  const userId = randomUUID();
  const today = isoToday();

  console.log(`Simulating user: ${userId}`);

  // 0. Create User (Required for foreign keys)
  const userRepo = new UserRepository(db);
  await userRepo.create({
    id: userId,
    email: `simulated-${userId}@example.com`,
    created_at: new Date().toISOString(),
  });

  // 1. Create settings with the simulated average cycle length.
  await settingsRepo.createDefault(userId);
  await settingsRepo.updateProfile(userId, { avg_cycle_length: 29 });

  // 2. Create 3 months of perfect data
  const logs: Log[] = [];
  const startDate = addDaysIso(today, -90);

  for (let i = 0; i < 90; i++) {
    const date = addDaysIso(startDate, i);
    const dayInCycle = (i % 29) + 1;

    let bleeding: Log['bleeding'] = 'none';
    let mucus: Log['mucus'] = null;
    let temp = 36.6 + Math.random() * 0.1;
    let lh: 'negative' | 'positive' = 'negative';

    // Period
    if (dayInCycle <= 5) {
      bleeding = dayInCycle === 1 ? 'heavy' : dayInCycle < 4 ? 'medium' : 'light';
    }

    // Fertile Window (CD 10-16)
    if (dayInCycle >= 10 && dayInCycle <= 15) {
      mucus = dayInCycle < 13 ? 'watery' : 'eggwhite';
      if (dayInCycle === 14) lh = 'positive';
    }

    // Post-Ovulation Shift
    if (dayInCycle > 14) {
      temp += 0.3 + Math.random() * 0.1;
    }

    const log: Log = {
      id: randomUUID(),
      user_id: userId,
      date,
      bleeding,
      temperature: temp,
      mucus,
      lh_test: lh,
      disturbances: [],
      symptoms: [],
      notes: `Simulated day ${i}`,
      created_at: new Date().toISOString(),
    };

    await logRepo.upsertLog(log);
    logs.push(log);
  }

  // 3. Run Engine
  const meta = await settingsRepo.getEngineMeta(userId);
  const result = runFusionEngine(userId, { logs, meta, today });

  await statusRepo.saveDailyStatuses(result.statuses);
  await cycleRepo.upsertCycles(result.cycles);

  console.log('Simulation complete. Check DB for results.');
  await db.close();
}

simulate().catch(console.error);
