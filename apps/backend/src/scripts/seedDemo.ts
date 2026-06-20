import { createDb } from '../db.js';
import { migrate } from '../migrate.js';
import { LogRepository, Log } from '../repositories/LogRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { runFusionEngine } from '../engine.js';
import { hashPassword } from '../password.js';
import { ensureUserForEmail } from '../auth.js';
import { DEMO_EMAIL } from '../demo.js';
import { addDaysIso, isoToday } from '../utils/dates.js';
import { loadEnv } from '../env.js';
import { randomUUID } from 'node:crypto';

loadEnv();

// The shared, public demo account. Re-running this script wipes whatever
// visitors have scribbled on it and rebuilds a clean ~6 months of history,
// so it stays presentable. Safe to run on a schedule.

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'demodemo';
const MONTHS = 6;
const TOTAL_DAYS = MONTHS * 30; // ~180 days of history

// Cycle lengths vary a touch so the data reads as human, not robotic, while
// staying regular enough that predictions look confident.
const CYCLE_LENGTHS = [28, 29, 27, 30, 28, 29];

// Rows keyed by user_id that must be cleared before a fresh seed. Mirrors the
// app-owned tables in resetDb.ts that hang off a user.
const USER_SCOPED_TABLES = [
  'logs',
  'daily_status',
  'cycles',
  'user_settings',
  'user_identities',
  'user_api_keys',
];

function jitter(amount: number): number {
  return (Math.random() - 0.5) * 2 * amount;
}

function chance(p: number): boolean {
  return Math.random() < p;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const NOTES = {
  period: ['Cramps in the evening — heat pad helped.', 'Flow heavier today.', 'Low energy, took it easy.'],
  fertile: ['Felt great today.', 'Noticed clear, stretchy fluid.', 'Lots of energy.'],
  luteal: ['A little bloated.', 'Calm, steady day.', 'Slept in, felt groggy.'],
} as const;

// Builds the optional log-screen fields for a day: body symptoms, mood/energy/
// sleep/libido/sex (namespaced into `symptoms` the way the log screen encodes
// them), factors (`disturbances`), and an occasional note. Realistically sparse,
// and kept off the temperature/mucus-critical days near ovulation so the engine
// keeps high-confidence signal where it matters.
function buildSignals(
  date: string,
  dayInCycle: number,
  ovulationDay: number
): { symptoms: string[]; disturbances: string[]; notes: string | null } {
  const symptoms: string[] = [];
  const disturbances: string[] = [];

  const weekday = new Date(`${date}T00:00:00`).getDay(); // 0 Sun .. 6 Sat
  const isWeekend = weekday === 0 || weekday === 6;
  const isPeriod = dayInCycle <= 5;
  const isFertile = dayInCycle >= ovulationDay - 4 && dayInCycle <= ovulationDay + 1;
  const isPms = dayInCycle > ovulationDay + 8;
  const nearOvulation = dayInCycle >= ovulationDay - 2 && dayInCycle <= ovulationDay + 1;

  // Physical symptoms cluster around the period and PMS.
  if (isPeriod) {
    if (chance(0.7)) symptoms.push('cramps');
    if (chance(0.4)) symptoms.push('bloating');
    if (chance(0.3)) symptoms.push('breast_tenderness');
  } else if (isPms) {
    if (chance(0.5)) symptoms.push('bloating');
    if (chance(0.4)) symptoms.push('breast_tenderness');
    if (chance(0.25)) symptoms.push('headache');
  }

  // Namespaced body signals (mood/energy/sleep/libido/sex).
  const mood = isPeriod
    ? pick(['irritable', 'sad', 'calm'])
    : isPms
      ? pick(['irritable', 'anxious', 'sad', 'calm'])
      : pick(['calm', 'calm', 'anxious']);
  if (chance(0.7)) symptoms.push(`mood:${mood}`);

  const energy = isPeriod
    ? pick(['low', 'low', 'normal'])
    : isFertile
      ? pick(['high', 'high', 'normal'])
      : pick(['normal', 'normal', 'low']);
  if (chance(0.75)) symptoms.push(`energy:${energy}`);

  // sleep:poor dents that day's temperature reliability, so keep it rare.
  const sleep = chance(0.1) ? 'poor' : pick(['good', 'good', 'fair']);
  if (chance(0.7)) symptoms.push(`sleep:${sleep}`);

  const libido = isPeriod ? 'low' : isFertile ? pick(['high', 'high', 'normal']) : pick(['normal', 'normal', 'low']);
  if (chance(0.65)) symptoms.push(`libido:${libido}`);

  // Sexual activity — the heart of the app's question. A few times per cycle,
  // weighted toward the fertile window.
  const sexChance = isPeriod ? 0.03 : isFertile ? 0.35 : 0.12;
  if (chance(sexChance)) symptoms.push(`sex:${pick(['protected', 'protected', 'unprotected'])}`);

  // Factors: occasional weekend drink, never on a temp-critical day.
  if (isWeekend && !nearOvulation && chance(0.18)) disturbances.push('alcohol');

  // An occasional, phase-flavoured note.
  let notes: string | null = null;
  if (chance(0.12)) {
    notes = pick(isPeriod ? NOTES.period : isFertile ? NOTES.fertile : NOTES.luteal);
  }

  return { symptoms, disturbances, notes };
}

async function seed() {
  const db = await createDb();
  await migrate(db);

  const userRepo = new UserRepository(db);
  const settingsRepo = new SettingsRepository(db);
  const logRepo = new LogRepository(db);
  const cycleRepo = new CycleRepository(db);
  const statusRepo = new DailyStatusRepository(db);

  // 1. Wipe any prior demo state so this is a clean rebuild.
  const existing = await userRepo.findByEmail(DEMO_EMAIL);
  if (existing) {
    console.log(`[seed:demo] Clearing previous demo data (${existing.id})...`);
    for (const t of USER_SCOPED_TABLES) {
      await db.query(`DELETE FROM "${t}" WHERE user_id = $1`, [existing.id]);
    }
    await db.query('DELETE FROM users WHERE id = $1', [existing.id]);
  }

  // 2. Fresh user + credentials so the demo is also reachable via the login form.
  const userId = await ensureUserForEmail(userRepo, settingsRepo, DEMO_EMAIL);
  await userRepo.setPassword(userId, await hashPassword(DEMO_PASSWORD));

  const today = isoToday();
  const startDate = addDaysIso(today, -TOTAL_DAYS);

  // 3. Mark onboarding done so the demo lands straight in the app.
  const avgCycleLength = Math.round(
    CYCLE_LENGTHS.reduce((a, b) => a + b, 0) / CYCLE_LENGTHS.length
  );
  await settingsRepo.completeOnboarding(userId, {
    cycle_regularity: 'regular',
    avgCycleLength,
  });

  // 4. Generate day-by-day logs across consecutive cycles of varying length.
  const logs: Log[] = [];
  let dayInCycle = 1;
  let cycleIdx = 0;
  let cycleLength = CYCLE_LENGTHS[0];

  for (let i = 0; i <= TOTAL_DAYS; i++) {
    const date = addDaysIso(startDate, i);
    const ovulationDay = cycleLength - 14; // luteal phase ~14 days

    // Log continuously right up to today so the current cycle stays tracked and
    // the calendar's default (current-month) view is full of colour. A long
    // recent gap would push the active cycle past its expected length, flip every
    // recent day to "unsure", and — since the calendar hides unsure days — leave a
    // demo visitor staring at a blank current month.
    let bleeding: Log['bleeding'] = 'none';
    let mucus: Log['mucus'] = null;
    let lh: 'negative' | 'positive' = 'negative';
    let temp = 36.5 + jitter(0.05);

    // Menstruation: first ~5 days, tapering.
    if (dayInCycle <= 5) {
      bleeding = dayInCycle === 1 ? 'heavy' : dayInCycle < 4 ? 'medium' : 'light';
    }

    // Fertile window approaching ovulation.
    if (dayInCycle >= ovulationDay - 4 && dayInCycle <= ovulationDay + 1) {
      mucus = dayInCycle < ovulationDay - 1 ? 'watery' : 'eggwhite';
      if (dayInCycle === ovulationDay - 1) lh = 'positive';
    }

    // Post-ovulation thermal shift.
    if (dayInCycle > ovulationDay) {
      temp += 0.3 + jitter(0.04);
    }

    const signals = buildSignals(date, dayInCycle, ovulationDay);

    // One short illness episode early in the history, placed on menstrual days
    // (no expected thermal shift) so it reads as real without hurting a
    // fertile-window prediction.
    if (cycleIdx === 1 && dayInCycle >= 2 && dayInCycle <= 4) {
      signals.disturbances.push('sick');
      if (dayInCycle === 2) signals.notes = 'Came down with a cold.';
      temp += 0.25; // mild fever
    }

    logs.push({
      id: randomUUID(),
      user_id: userId,
      date,
      bleeding,
      temperature: Number(temp.toFixed(2)),
      mucus,
      lh_test: lh,
      disturbances: signals.disturbances,
      symptoms: signals.symptoms,
      notes: signals.notes,
      created_at: new Date().toISOString(),
    });

    // Advance to the next day / next cycle.
    if (dayInCycle >= cycleLength) {
      dayInCycle = 1;
      cycleIdx += 1;
      cycleLength = CYCLE_LENGTHS[cycleIdx % CYCLE_LENGTHS.length];
    } else {
      dayInCycle += 1;
    }
  }

  for (const log of logs) {
    await logRepo.upsertLog(log);
  }

  // 5. Run the real engine so charts/predictions match a genuine account.
  const meta = await settingsRepo.getEngineMeta(userId);
  const result = runFusionEngine(userId, { logs, meta, today });
  await statusRepo.saveDailyStatuses(result.statuses);
  await cycleRepo.upsertCycles(result.cycles);

  console.log(
    `[seed:demo] Done. ${logs.length} logs, ${result.cycles.length} cycles for ${DEMO_EMAIL}.`
  );
  await db.close();
}

seed().catch((err) => {
  console.error('[seed:demo] FAILED:', err);
  process.exit(1);
});
