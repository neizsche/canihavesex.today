import { Db } from '../db.js';
import { LogRepository, Log, logHasMeaningfulData } from '../repositories/LogRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { EngineService } from './EngineService.js';
import { randomUUID } from 'node:crypto';
import { addDaysIso } from '../utils/dates.js';
import { buildInsightCards } from '../utils/insights.js';

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
    authType?: 'cookie' | 'api_key';
    today?: string; // current date for engine context
}

export class LogService {
    private logRepo: LogRepository;
    private cycleRepo: CycleRepository;
    private statusRepo: DailyStatusRepository;
    private engine: EngineService;

    constructor(private db: Db) {
        this.logRepo = new LogRepository(db);
        this.cycleRepo = new CycleRepository(db);
        this.statusRepo = new DailyStatusRepository(db);
        this.engine = new EngineService(db);
    }

    async upsertLogAndTriggerEngine(data: LogUpsertData) {
        const { userId, date, authType } = data;
        const today = data.today || date;

        const isApiKey = authType === 'api_key';
        const existing = isApiKey ? await this.logRepo.getLog(userId, date) : null;

        // Merge logic if API key, otherwise take from body
        const logData: Omit<Log, 'created_at'> = {
            id: randomUUID(),
            user_id: userId,
            date: date,
            bleeding: (isApiKey ? (data.bleeding ?? existing?.bleeding ?? null) : (data.bleeding ?? null)) as any,
            temperature: isApiKey ? (data.temperature ?? existing?.temperature ?? null) : (data.temperature ?? null),
            mucus: (isApiKey ? (data.mucusType ?? existing?.mucus ?? null) : (data.mucusType ?? null)) as any,
            lh_test: (isApiKey ? (data.lhTest ?? existing?.lh_test ?? null) : (data.lhTest ?? null)) as any,
            disturbances: isApiKey ? (data.disturbances ?? existing?.disturbances ?? []) : (data.disturbances || []),
            symptoms: isApiKey ? (data.symptoms ?? existing?.symptoms ?? []) : (data.symptoms || []),
            notes: isApiKey ? (data.notes ?? existing?.notes ?? null) : (data.notes ?? null),
        };

        // 1. Write Log
        await this.logRepo.upsertLog(logData);

        // 2. Trigger Engine (write-through) only when fertility-affecting data
        // changed, and only when the edit lands in the current/future cycle —
        // editing ancient history doesn't shift today's status.
        const hasPhysiologicalData =
            data.bleeding !== undefined ||
            data.temperature !== undefined ||
            data.mucusType !== undefined ||
            data.lhTest !== undefined ||
            (data.disturbances && data.disturbances.length > 0);

        if (hasPhysiologicalData) {
            try {
                const existingCycles = await this.cycleRepo.getCycleHistory(userId);
                const latestCycle = existingCycles[0];
                const isCurrentCycle = !latestCycle || date >= latestCycle.start_date;
                if (isCurrentCycle) {
                    await this.engine.recompute(userId, today, existingCycles);
                }
            } catch (err) {
                console.error('[LogService] Engine Error:', err);
                throw err;
            }
        }

        const todayStatus = await this.statusRepo.getTodayStatus(userId, today);
        return { ok: true, today: this.buildTodayResponse(todayStatus) };
    }

    private buildTodayResponse(status: any) {
        if (!status) return null;
        const insights = buildInsightCards(status.fertility_status, status.phase, status.insights_payload);
        return {
            status: status.fertility_status,
            insights,
            date: status.date,
            dailyLogDone: true,
        };
    }

    async getLogWithSuggestion(userId: string, date: string, today: string) {
        const [user, earliestCycleStart, log] = await Promise.all([
            new UserRepository(this.db).findById(userId),
            this.cycleRepo.getEarliestCycleStartDate(userId),
            this.logRepo.getLog(userId, date)
        ]);

        // Fallback for minDate
        const createdAt = user?.created_at ? (typeof user.created_at === 'string' ? user.created_at : (user.created_at as any).toISOString()) : null;
        let minDate = createdAt ? createdAt.split('T')[0] : '2024-01-01';
        if (earliestCycleStart && earliestCycleStart < minDate) {
            minDate = earliestCycleStart;
        }

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

        let suggestion = undefined;
        if (date === today) {
            const yesterday = addDaysIso(date, -1);
            const prevLog = await this.logRepo.getLog(userId, yesterday);
            if (prevLog) {
                suggestion = {
                    sourceDate: yesterday,
                    bleeding: prevLog.bleeding,
                    temperature: prevLog.temperature,
                    mucusType: prevLog.mucus
                };
            }
        }

        return { found: false, hasData: false, minDate, suggestion };
    }
}
