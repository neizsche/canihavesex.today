import { Db } from '../db.js';
import { LogRepository, Log, logHasMeaningfulData } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { EngineService } from './EngineService.js';
import { randomUUID } from 'node:crypto';
import { backlogFloorIso } from '../utils/dates.js';
import { buildInsightCards } from '../utils/insights.js';

// Bleeding levels that mark a real period start (mirrors engine segmentation:
// `spotting` alone does not start a cycle). Logging one of these resumes a
// paused tracker — "log a period and we'll pick back up".
const PERIOD_BLEED = new Set(['light', 'medium', 'heavy']);

export interface LogUpsertData {
    userId: string;
    date: string;
    bleeding?: string | null;
    temperature?: number | null;
    mucusType?: string | null;
    lhTest?: string | null;
    disturbances?: string[];
    symptoms?: string[];
    notes?: string | null;
    today?: string; // current date for engine context
}

export class LogService {
    private logRepo: LogRepository;
    private cycleRepo: CycleRepository;
    private statusRepo: DailyStatusRepository;
    private settingsRepo: SettingsRepository;
    private engine: EngineService;

    constructor(private db: Db) {
        this.logRepo = new LogRepository(db);
        this.cycleRepo = new CycleRepository(db);
        this.statusRepo = new DailyStatusRepository(db);
        this.settingsRepo = new SettingsRepository(db);
        this.engine = new EngineService(db);
    }

    async upsertLogAndTriggerEngine(data: LogUpsertData) {
        const { userId, date } = data;
        const today = data.today || date;

        // Normalize UI sentinel values to DB-safe values
        const sanitizedLhTest = (data.lhTest === 'notTaken' || data.lhTest === '') ? null : data.lhTest;
        const sanitizedBleeding = data.bleeding === 'none' ? null : data.bleeding;

        const logData: Omit<Log, 'created_at'> = {
            id: randomUUID(),
            user_id: userId,
            date: date,
            bleeding: (sanitizedBleeding ?? null) as any,
            temperature: data.temperature ?? null,
            mucus: (data.mucusType ?? null) as any,
            lh_test: (sanitizedLhTest ?? null) as any,
            disturbances: data.disturbances || [],
            symptoms: data.symptoms || [],
            notes: data.notes ?? null,
        };

        // 1. Prepare parallel promises
        const hasPhysiologicalData =
            data.bleeding !== undefined ||
            data.temperature !== undefined ||
            data.mucusType !== undefined ||
            data.lhTest !== undefined ||
            (data.disturbances && data.disturbances.length > 0);

        const writeLogPromise = this.logRepo.upsertLog(logData);
        const existingCyclesPromise = hasPhysiologicalData ? this.cycleRepo.getCycleHistory(userId) : Promise.resolve([]);

        // Wait for log to be written before we trigger engine, because engine fetches logs
        await writeLogPromise;

        // A logged period resumes a paused tracker and clears any stale drift ack
        // — the fresh cycle is now the source of truth.
        if (logData.bleeding && PERIOD_BLEED.has(String(logData.bleeding))) {
            await this.settingsRepo.setReanchorState(userId, { paused: false, kind: null, cycleStart: null });
        }

        let todayStatus;

        // 2. Trigger Engine (write-through) only when fertility-affecting data changed
        if (hasPhysiologicalData) {
            try {
                const existingCycles = await existingCyclesPromise;
                // Recompute on every physiological edit, even into a prior cycle. An
                // edit anywhere in the editable window can move cycle boundaries and
                // the history-derived stats (median length, luteal, regularity) that
                // drive the current prediction — and we want the touched cycle's
                // calendar colours refreshed now, not lazily on the next Today read.
                todayStatus = await this.engine.recompute(userId, today, existingCycles, date);
            } catch (err) {
                console.error('[LogService] Engine Error:', err);
                throw err;
            }
        }

        if (!todayStatus) {
            todayStatus = await this.statusRepo.getTodayStatus(userId, today);
        }
        return { ok: true, today: this.buildTodayResponse(todayStatus) };
    }

    private buildTodayResponse(status: any) {
        if (!status) return null;
        const insights = buildInsightCards(status.fertility_status, status.phase, status.insights_payload, status.date);
        return {
            status: status.fertility_status,
            insights,
            date: status.date,
            dailyLogDone: true,
            // After a log, drift is typically resolved; the GET /insights/today
            // refetch (triggered on mutation settle) reconciles the full state.
            reanchor: { show: false, acked: false },
        };
    }

    async getLogWithSuggestion(userId: string, date: string, today: string) {
        const log = await this.logRepo.getLog(userId, date);

        // Earliest editable day: the back-log window floor. Drives the log
        // screen's backward navigation limit (matches the server edit lock).
        const minDate = backlogFloorIso(today);

        if (log) {
            return {
                found: true,
                hasData: logHasMeaningfulData(log),
                payload: {
                    date: log.date,
                    bleeding: log.bleeding || 'none',
                    temperature: log.temperature,
                    mucusType: log.mucus,
                    lhTest: log.lh_test,
                    disturbances: log.disturbances,
                    symptoms: log.symptoms,
                    notes: log.notes
                },
                minDate
            };
        }

        return { found: false, hasData: false, minDate };
    }
}
