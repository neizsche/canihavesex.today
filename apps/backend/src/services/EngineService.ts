import { Db } from '../db.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { CycleRepository, Cycle } from '../repositories/CycleRepository.js';
import { DailyStatusRepository, DailyStatus } from '../repositories/DailyStatusRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { runFusionEngine, ENGINE_VERSION } from '../engine.js';
import { addDaysIso } from '../utils/dates.js';

/**
 * Owns every "re-run the fertility engine and refresh the cache" path. Previously
 * this exact sequence — fetch cycles, derive a lookback window, fetch logs + meta,
 * run the engine, persist statuses + cycles — was copy-pasted in LogService and
 * the calendar/user routes. Centralizing it keeps the read/write-through cache
 * logic in one place.
 */
export class EngineService {
  private logRepo: LogRepository;
  private cycleRepo: CycleRepository;
  private statusRepo: DailyStatusRepository;
  private settingsRepo: SettingsRepository;

  constructor(db: Db) {
    this.logRepo = new LogRepository(db);
    this.cycleRepo = new CycleRepository(db);
    this.statusRepo = new DailyStatusRepository(db);
    this.settingsRepo = new SettingsRepository(db);
  }

  /**
   * Re-run the engine and persist the resulting daily statuses and cycles.
   * Returns today's status, or null when the user has no logs yet. Pass
   * `existingCycles` to reuse a list the caller already fetched.
   */
  async recompute(userId: string, today: string, existingCycles?: Cycle[]): Promise<DailyStatus | null> {
    const cycles = existingCycles ?? (await this.cycleRepo.getCycleHistory(userId));
    const lookbackDate = lookbackFrom(cycles, today);

    const [logs, meta] = await Promise.all([
      this.logRepo.getLogsSince(userId, lookbackDate),
      this.settingsRepo.getEngineMeta(userId),
    ]);

    if (!logs.length) return null;

    const result = runFusionEngine(userId, { logs, meta, existingCycles: cycles, today });
    await this.statusRepo.saveDailyStatuses(result.statuses);
    await this.cycleRepo.upsertCycles(result.cycles);

    return this.statusRepo.getTodayStatus(userId, today);
  }

  /**
   * Today's cached status, recomputing first if the cache is missing, was
   * produced by an older engine version, or predates the latest log edit.
   */
  async getFreshTodayStatus(userId: string, today: string): Promise<DailyStatus | null> {
    const status = await this.statusRepo.getTodayStatus(userId, today);
    if (status && !(await this.isStale(userId, status))) {
      return status;
    }
    return this.recompute(userId, today);
  }

  private async isStale(userId: string, status: DailyStatus): Promise<boolean> {
    // Output format changed under our feet — the cached row is from an old engine.
    if (status.engine_version !== ENGINE_VERSION) return true;

    const latestLogUpdatedAt = await this.logRepo.getLatestUpdateTimestamp(userId);
    if (!latestLogUpdatedAt || !status.updated_at) return true;
    return new Date(latestLogUpdatedAt).getTime() > new Date(status.updated_at).getTime();
  }
}

/**
 * How far back to read logs for analysis context: the start of the 3rd-most-recent
 * cycle (enough history without fetching everything), else the earliest known
 * cycle, else 120 days.
 */
function lookbackFrom(cycles: Cycle[], today: string): string {
  if (cycles.length >= 3) return cycles[2].start_date;
  if (cycles.length > 0) return cycles[cycles.length - 1].start_date;
  return addDaysIso(today, -120);
}
