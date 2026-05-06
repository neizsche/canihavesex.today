import { FastifyInstance } from 'fastify';
import { LogRepository } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { UserMetaRepository } from '../repositories/UserMetaRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { runFusionEngine } from '../engine.js';
import { randomUUID } from 'node:crypto';
import { addDaysIso, isoDateForOffset, isoToday, parseTimezoneOffsetMinutes } from '../utils/dates.js';

// Types
type PostLogBody = {
    date: string;
    bleeding?: string | null;
    temperature?: number | null;
    mucusType?: string | null;
    lhTest?: string | null;
    disturbances?: string[];
    symptoms?: string[];
    notes?: string | null;
};

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function logsRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const logRepo = new LogRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const statusRepo = new DailyStatusRepository(opts.db);
    const metaRepo = new UserMetaRepository(opts.db);
    const userRepo = new UserRepository(opts.db);
    const getTzOffsetMinutes = (req: any) =>
        parseTimezoneOffsetMinutes(req.headers['x-timezone-offset'] ?? req.headers['x-tz-offset']);

    // Bootstrap V5 schema on startup (using meta repo as schema manager for now)
    await metaRepo.bootstrap();

    // GET /api/v1/logs/:date
    app.get('/api/v1/logs/:date', {
        schema: {
            params: z.object({
                date: z.string()
            })
        }
    }, async (req, reply) => {
        const userId = (req as any).userId;
        const dateStr = req.params.date;
        const tzOffsetMinutes = getTzOffsetMinutes(req);
        const today = isoToday(tzOffsetMinutes);

        const minDatePromise = (async () => {
            const [user, earliestCycleStart] = await Promise.all([
                userRepo.findById(userId),
                cycleRepo.getEarliestCycleStartDate(userId)
            ]);
            let minDate = user?.created_at
                ? isoDateForOffset(new Date(user.created_at), tzOffsetMinutes)
                : '2024-01-01';

            if (earliestCycleStart && earliestCycleStart < minDate) {
                minDate = earliestCycleStart;
            }
            return minDate;
        })();

        const [log, minDate] = await Promise.all([
            logRepo.getLog(userId, dateStr),
            minDatePromise
        ]);

        if (log) {
            return {
                found: true,
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

        // LOG SUGGESTION LOGIC (Optimization: merged from separate endpoint)
        // Check if we can offer a prefill suggestion if looking at TODAY
        let suggestion = undefined;

        if (dateStr === today) {
            try {
                const yesterday = addDaysIso(dateStr, -1);

                const prevLog = await logRepo.getLog(userId, yesterday);
                if (prevLog) {
                    suggestion = {
                        sourceDate: yesterday,
                        bleeding: prevLog.bleeding,
                        temperature: prevLog.temperature,
                        mucusType: prevLog.mucus
                    };
                }
            } catch (e) {
                // ignore parsing errors
            }
        }

        return { found: false, minDate, suggestion };
    });

    // GET /api/v1/logs/suggestion (Smart Prefill - Separate Endpoint)
    app.get('/api/v1/logs/suggestion', {
        schema: {
            querystring: z.object({
                date: z.string()
            })
        }
    }, async (req, reply) => {
        const userId = (req as any).userId;
        const targetDate = req.query.date;
        const tzOffsetMinutes = getTzOffsetMinutes(req);
        const today = isoToday(tzOffsetMinutes);

        // Requirement: "prefilling... only if logging date is today"
        if (targetDate !== today) {
            return { available: false };
        }

        try {
            const yesterday = addDaysIso(targetDate, -1);

            const prevLog = await logRepo.getLog(userId, yesterday);
            if (prevLog) {
                return {
                    available: true,
                    suggestion: {
                        sourceDate: yesterday,
                        bleeding: prevLog.bleeding,
                        temperature: prevLog.temperature,
                        mucusType: prevLog.mucus
                    }
                };
            }
        } catch (e) {
            // parsing error
        }

        return { available: false };
    });

    // PUT /api/v1/logs/:date (Write-Through)
    app.put('/api/v1/logs/:date', {
        schema: {
            params: z.object({
                date: z.string()
            }),
            body: z.object({
                date: z.string(),
                bleeding: z.string().nullable().optional(),
                temperature: z.number().nullable().optional(),
                mucusType: z.string().nullable().optional(),
                lhTest: z.string().nullable().optional(),
                disturbances: z.array(z.string()).optional(),
                symptoms: z.array(z.string()).optional(),
                notes: z.string().nullable().optional()
            })
        }
    }, async (req, reply) => {
        const userId = (req as any).userId;
        const tzOffsetMinutes = getTzOffsetMinutes(req);
        const today = isoToday(tzOffsetMinutes);
        const body = req.body;
        const dateStr = req.params.date;
        if (!dateStr) {
            return reply.status(400).send({ error: 'Missing date in path' });
        }
        const isApiKey = (req as any).authType === 'api_key';
        const existing = isApiKey ? await logRepo.getLog(userId, dateStr) : null;

        const bleeding = isApiKey ? (body.bleeding ?? existing?.bleeding ?? null) : (body.bleeding as any);
        const temperature = isApiKey ? (body.temperature ?? existing?.temperature ?? null) : (body.temperature ?? null);
        const mucus = isApiKey ? (body.mucusType ?? existing?.mucus ?? null) : (body.mucusType as any);
        const lhTest = isApiKey ? (body.lhTest ?? existing?.lh_test ?? null) : (body.lhTest as any);
        const disturbances = isApiKey
            ? (body.disturbances ?? existing?.disturbances ?? [])
            : (body.disturbances || []);
        const symptoms = isApiKey
            ? (body.symptoms ?? existing?.symptoms ?? [])
            : (body.symptoms || []);
        const notes = isApiKey
            ? (existing?.notes ?? body.notes ?? null)
            : (body.notes ?? null);

        // 1. Write Log
        await logRepo.upsertLog({
            id: randomUUID(),
            user_id: userId,
            date: dateStr,
            bleeding: bleeding as any,
            temperature,
            mucus: mucus as any,
            lh_test: lhTest as any,
            disturbances,
            symptoms,
            notes
        });

        // 2. Trigger Engine (Write-Through)
        try {
            const existingCycles = await cycleRepo.getCycleHistory(userId);

            // Optimization: Only recompute if the log is in the CURRENT active cycle or future
            const latestCycle = existingCycles[0]; // Sort is DESC by start_date
            const isCurrentCycle = !latestCycle || dateStr >= latestCycle.start_date;

            if (isCurrentCycle) {
                const [logs, meta] = await Promise.all([
                    logRepo.getAllLogs(userId),
                    metaRepo.getUserMeta(userId)
                ]);

                // @ts-ignore
                const { statuses, cycles } = runFusionEngine(userId, { logs, meta, existingCycles, today });

                // 3. Update Cache (Smart Merge)
                await statusRepo.saveDailyStatuses(statuses);
                await cycleRepo.upsertCycles(cycles);
            } else {
                req.log.info({ userId, date: dateStr, msg: "Skipped engine re-run for historical log" });
            }
        } catch (err) {
            console.error('[Engine Error]', err);
            throw err;
        }

        return { ok: true };
    });
}
