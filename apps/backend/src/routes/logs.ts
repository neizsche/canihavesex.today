import { FastifyInstance } from 'fastify';
import { LogRepository } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { UserMetaRepository } from '../repositories/UserMetaRepository.js';
import { runFusionEngine } from '../engine.js';
import { randomUUID } from 'node:crypto';

// Types
type PostLogBody = {
    date: string;
    bleeding: string | null;
    temperature: number | null;
    mucusType: string | null;
    lhTest: string | null;
    disturbances: string[];
    symptoms: string[];
    notes: string | null;
};

export async function logsRoutes(app: FastifyInstance, opts: { db: any }) {
    const logRepo = new LogRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const statusRepo = new DailyStatusRepository(opts.db);
    const metaRepo = new UserMetaRepository(opts.db);

    // Bootstrap V5 schema on startup (using meta repo as schema manager for now)
    await metaRepo.bootstrap();

    // GET /api/logs/:date
    app.get<{ Params: { date: string } }>('/api/logs/:date', async (req, reply) => {
        const userId = (req as any).userId;
        const dateStr = req.params.date;
        const log = await logRepo.getLog(userId, dateStr);

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
                }
            };
        }
        return { found: false };
    });

    // GET /api/logs/suggestion (Smart Prefill - Separate Endpoint)
    app.get<{ Querystring: { date: string } }>('/api/logs/suggestion', async (req, reply) => {
        const userId = (req as any).userId;
        const targetDate = req.query.date;
        const today = new Date().toISOString().split('T')[0];

        // Requirement: "prefilling... only if logging date is today"
        if (targetDate !== today) {
            return { available: false };
        }

        try {
            const d = new Date(targetDate);
            d.setDate(d.getDate() - 1);
            const yesterday = d.toISOString().split('T')[0];

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

    // POST /api/logs (Write-Through)
    app.post<{ Body: PostLogBody }>('/api/logs', async (req, reply) => {
        const userId = (req as any).userId;
        const body = req.body;

        // 1. Write Log
        await logRepo.upsertLog({
            id: randomUUID(),
            user_id: userId,
            date: body.date,
            bleeding: body.bleeding as any,
            temperature: body.temperature,
            mucus: body.mucusType as any,
            lh_test: body.lhTest as any,
            disturbances: body.disturbances || [],
            symptoms: body.symptoms || [],
            notes: body.notes
        });

        // 2. Trigger Engine (Write-Through)
        try {
            const existingCycles = await cycleRepo.getCycleHistory(userId);

            // Optimization: Only recompute if the log is in the CURRENT active cycle or future
            const latestCycle = existingCycles[0]; // Sort is DESC by start_date
            const isCurrentCycle = !latestCycle || body.date >= latestCycle.start_date;

            if (isCurrentCycle) {
                const logs = await logRepo.getAllLogs(userId);
                const meta = await metaRepo.getUserMeta(userId);

                // @ts-ignore
                const { statuses, cycles } = runFusionEngine(userId, { logs, meta, existingCycles });

                // 3. Update Cache (Smart Merge)
                await statusRepo.saveDailyStatuses(statuses);
                await cycleRepo.upsertCycles(cycles);
            } else {
                req.log.info({ userId, date: body.date, msg: "Skipped engine re-run for historical log" });
            }
        } catch (err) {
            console.error('[Engine Error]', err);
            throw err;
        }

        return { ok: true };
    });
}
