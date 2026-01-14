import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { appendRawLog, runEngineV2, fertilityIndexForLog } from '../engineV2.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { EngineRepository } from '../repositories/EngineRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { PreferencesRepository } from '../repositories/PreferencesRepository.js';
import type { Db } from '../db.js';

const LogDayBody = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mucusType: z.enum(['dry', 'sticky', 'creamy', 'watery', 'eggwhite']),
    sensation: z.enum(['dry', 'damp', 'slippery']),
    bleeding: z.enum(['none', 'spotting', 'light', 'heavy']),
    temperature: z.number().nullable().optional(),
    lhTest: z.enum(['positive', 'negative', 'notTaken']),
    // phase-1: optional extensions (no screen changes required)
    sex: z.boolean().optional(),
    sleepHours: z.number().nullable().optional(),
    alcohol: z.boolean().optional(),
    illness: z.boolean().optional(),
    stress: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
    // optional quality flags
    fever: z.boolean().optional(),
    lateNight: z.boolean().optional(),
    measuredLate: z.boolean().optional(),
    semenExposure: z.boolean().optional(),
    infection: z.boolean().optional(),
});

export async function apiRoutes(
    app: FastifyInstance,
    opts: {
        logRepository: LogRepository;
        engineRepository: EngineRepository;
        cycleRepository: CycleRepository;
        userRepository: UserRepository;
        preferencesRepository: PreferencesRepository;
        db: Db;
    }
) {
    const { logRepository, engineRepository, cycleRepository, db, userRepository, preferencesRepository } = opts;

    app.post('/api/log-day', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;
            const parsed = LogDayBody.safeParse(req.body);
            if (!parsed.success) {
                req.log.warn({ route: '/api/log-day', userId, validationError: parsed.error }, 'invalid payload');
                return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.issues });
            }

            const {
                date,
                mucusType,
                sensation,
                bleeding,
                temperature,
                lhTest,
                sex,
                sleepHours,
                alcohol,
                illness,
                stress,
                notes,
                fever,
                lateNight,
                measuredLate,
                semenExposure,
                infection,
            } = parsed.data;

            // Avoid logging sensitive health signals.
            app.log.info({ route: '/api/log-day', userId, date }, 'log-day');

            try {
                // Append-only raw log event (new source of truth)
                await appendRawLog(logRepository, {
                    userId,
                    date,
                    payload: {
                        mucusType,
                        sensation,
                        bleeding,
                        temperature: temperature ?? null,
                        lhTest,
                        sex,
                        sleepHours: sleepHours ?? null,
                        alcohol,
                        illness,
                        stress: stress ?? null,
                        notes: notes ?? null,
                        fever,
                        lateNight,
                        measuredLate,
                        semenExposure,
                        infection,
                    },
                });

                // Recompute and persist engine results for today (deterministic, versioned).
                // This also maintains daily_logs + cycles compat fields under the hood.
                const engine = await runEngineV2(
                    { logRepo: logRepository, engineRepo: engineRepository, cycleRepo: cycleRepository },
                    { userId, asOfDate: date }
                );

                return reply.send({
                    ok: true,
                    cycleState: 'UPDATED',
                    engineVersion: 'v2',
                    today: {
                        date: new Date().toISOString().slice(0, 10),
                        risk: engine.publicToday.risk,
                        explanation: engine.publicToday.explanation,
                        analytics: engine.analytics,
                        disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
                    }
                });

            } catch (dbError) {
                req.log.error({ route: '/api/log-day', userId, dbError, date }, 'database operation failed');
                return reply.status(500).send({ error: 'Database operation failed' });
            }

        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/log-day', userId, error }, 'unexpected error in log-day');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    app.get('/api/today', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;
            const today = new Date().toISOString().slice(0, 10);

            try {
                const engine = await runEngineV2(
                    { logRepo: logRepository, engineRepo: engineRepository, cycleRepo: cycleRepository },
                    { userId, asOfDate: today }
                );

                return {
                    date: today,
                    risk: engine.publicToday.risk,
                    explanation: engine.publicToday.explanation,
                    analytics: engine.analytics,
                    disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
                };

            } catch (dbError) {
                req.log.error({ route: '/api/today', userId, dbError }, 'database operation failed');
                return reply.status(500).send({ error: 'Database operation failed' });
            }

        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/today', userId, error }, 'unexpected error in today');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    app.get('/api/chart', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;

            try {
                const today = new Date().toISOString().slice(0, 10);
                const engine = await runEngineV2(
                    { logRepo: logRepository, engineRepo: engineRepository, cycleRepo: cycleRepository },
                    { userId, asOfDate: today }
                );
                const cycleId = engine.output.cycle_id;

                const cycleById = await cycleRepository.findById(cycleId);
                const currentCycle = await cycleRepository.findCurrent(userId);
                // Fallback logic preserved from original code
                const cycle = cycleById ?? currentCycle;

                if (!cycle) {
                    return reply.status(404).send({ error: "Cycle not found" });
                }

                const logsInCycle = await logRepository.findDailyLogsByCycleId(cycle.id);

                const riskByDate = new Map<string, 'HIGH' | 'MEDIUM' | 'LOW'>();
                for (const r of engine.output.daily_risks) {
                    const rr = (r.risk === 'VERY_HIGH' ? 'HIGH' : r.risk) as 'HIGH' | 'MEDIUM' | 'LOW';
                    riskByDate.set(r.date, rr);
                }

                app.log.info(
                    { route: '/api/chart', userId, cycleId: cycle.id, days: logsInCycle.length, state: cycle.state },
                    'chart data calculated'
                );

                const days = logsInCycle
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((l) => {
                        let idx = 0;
                        try {
                            idx = fertilityIndexForLog({ mucusType: l.mucus_type as any, sensation: l.sensation as any });
                        } catch (calcError) {
                            // ignore
                        }
                        return {
                            date: l.date,
                            fertilityIndex: idx,
                            risk: riskByDate.get(l.date) ?? ('HIGH' as const),
                            temperature: l.temperature,
                            lhTest: l.lh_test,
                        };
                    });

                return {
                    cycle: {
                        id: cycle.id,
                        startDate: cycle.start_date,
                        state: cycle.state,
                        peakDate: cycle.peak_date,
                        tempShiftConfirmedDate: cycle.temp_shift_confirmed_date,
                    },
                    analytics: engine.analytics,
                    days,
                    disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
                };

            } catch (dbError) {
                req.log.error({ route: '/api/chart', userId, dbError }, 'database operation failed');
                return reply.status(500).send({ error: 'Database operation failed' });
            }

        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/chart', userId, error }, 'unexpected error in chart');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    app.post('/api/reset-cycle', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;
            const now = new Date().toISOString();
            const startDate = now.slice(0, 10);
            const cycleId = randomUUID();

            try {
                const currentCycle = await cycleRepository.findCurrent(userId);
                if (currentCycle) {
                    await logRepository.deleteRawLogsFromDate(userId, currentCycle.start_date);
                }

                await cycleRepository.create({
                    id: cycleId,
                    user_id: userId,
                    start_date: startDate,
                    state: 'INFERTILE_PRE',
                    peak_date: null,
                    temp_shift_confirmed_date: null,
                    created_at: now
                });

                // Run engine to get fresh data for cache
                const today = new Date().toISOString().slice(0, 10);
                const engine = await runEngineV2(
                    { logRepo: logRepository, engineRepo: engineRepository, cycleRepo: cycleRepository },
                    { userId, asOfDate: today }
                );

                req.log.info({ route: '/api/reset-cycle', userId, cycleId }, 'cycle reset');
                return reply.send({
                    ok: true,
                    today: {
                        date: today,
                        risk: engine.publicToday.risk,
                        explanation: engine.publicToday.explanation,
                        analytics: engine.analytics,
                        disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
                    },
                    chart: {
                        cycle: {
                            id: cycleId,
                            startDate: startDate,
                            state: 'INFERTILE_PRE',
                            peakDate: null,
                            tempShiftConfirmedDate: null,
                        },
                        analytics: engine.analytics,
                        days: [],
                        disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
                    }
                });

            } catch (dbError) {
                req.log.error({ route: '/api/reset-cycle', userId, dbError }, 'database operation failed');
                return reply.status(500).send({ error: 'Failed to reset cycle' });
            }

        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/reset-cycle', userId, error }, 'unexpected error in reset-cycle');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    app.post('/api/delete-all-data', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;

            app.log.warn({ route: '/api/delete-all-data', userId }, 'delete all user fertility data initiated');

            try {
                await db.transaction(async (txDb) => {
                    const txEngineRepo = new EngineRepository(txDb);
                    const txLogRepo = new LogRepository(txDb);
                    const txCycleRepo = new CycleRepository(txDb);

                    await txEngineRepo.deleteTracesByUserId(userId);
                    await txEngineRepo.deleteResultsByUserId(userId);
                    await txEngineRepo.deleteNormalizedDaysByUserId(userId);
                    await txLogRepo.deleteDailyLogsByUserId(userId);
                    await txCycleRepo.deleteByUserId(userId);
                    await txLogRepo.deleteRawLogsByUserId(userId);
                });

                // After deletion, create a fresh cycle and return empty data for cache
                const now = new Date().toISOString();
                const startDate = now.slice(0, 10);
                const cycleId = randomUUID();

                await cycleRepository.create({
                    id: cycleId,
                    user_id: userId,
                    start_date: startDate,
                    state: 'INFERTILE_PRE',
                    peak_date: null,
                    temp_shift_confirmed_date: null,
                    created_at: now
                });

                // Run engine to get fresh empty state
                const engine = await runEngineV2(
                    { logRepo: logRepository, engineRepo: engineRepository, cycleRepo: cycleRepository },
                    { userId, asOfDate: startDate }
                );

                app.log.info({ route: '/api/delete-all-data', userId }, 'data deleted');
                return reply.send({
                    ok: true,
                    today: {
                        date: startDate,
                        risk: engine.publicToday.risk,
                        explanation: engine.publicToday.explanation,
                        analytics: engine.analytics,
                        disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
                    },
                    chart: {
                        cycle: {
                            id: cycleId,
                            startDate: startDate,
                            state: 'INFERTILE_PRE',
                            peakDate: null,
                            tempShiftConfirmedDate: null,
                        },
                        analytics: engine.analytics,
                        days: [],
                        disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
                    }
                });

            } catch (dbError) {
                req.log.error({ route: '/api/delete-all-data', userId, dbError }, 'database operation failed');
                return reply.status(500).send({ error: 'Database operation failed' });
            }

        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/delete-all-data', userId, error }, 'unexpected error in delete-all-data');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    app.post('/api/delete-account', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;

            app.log.warn({ route: '/api/delete-account', userId }, 'delete account initiated');

            try {
                await db.transaction(async (txDb) => {
                    const txEngineRepo = new EngineRepository(txDb);
                    const txLogRepo = new LogRepository(txDb);
                    const txCycleRepo = new CycleRepository(txDb);
                    const txUserRepo = new UserRepository(txDb);

                    // 1. Delete all fertility data
                    await txEngineRepo.deleteTracesByUserId(userId);
                    await txEngineRepo.deleteResultsByUserId(userId);
                    await txEngineRepo.deleteNormalizedDaysByUserId(userId);
                    await txLogRepo.deleteDailyLogsByUserId(userId);
                    await txCycleRepo.deleteByUserId(userId);
                    await txLogRepo.deleteRawLogsByUserId(userId);

                    // 2. Delete user identities
                    await txUserRepo.deleteIdentitiesByUserId(userId);

                    // 3. Delete user
                    await txUserRepo.delete(userId);
                });

                // 4. Clear session cookie
                const sameSite = process.env.COOKIE_SAMESITE === 'none' ? 'none' as const : 'lax' as const;
                const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
                const base = {
                    path: '/',
                    httpOnly: true,
                    sameSite,
                    secure,
                };

                reply.clearCookie('uid', { ...base, signed: true });
                reply.clearCookie('uid', { ...base, signed: false });

                app.log.info({ route: '/api/delete-account', userId }, 'account deleted');
                return reply.send({ ok: true });

            } catch (dbError) {
                req.log.error({ route: '/api/delete-account', userId, dbError }, 'database operation failed');
                return reply.status(500).send({ error: 'Database operation failed' });
            }

        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/delete-account', userId, error }, 'unexpected error in delete-account');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    // Preferences API
    app.get('/api/preferences', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;

            let prefs = await preferencesRepository.findByUserId(userId);

            // Create default preferences if none exist
            if (!prefs) {
                prefs = await preferencesRepository.createDefault(userId);
            }

            return reply.send({ theme: prefs.theme });
        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/preferences', userId, error }, 'unexpected error in preferences');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });

    app.patch('/api/preferences', async (req, reply) => {
        try {
            const userId = (req as any).userId as string;
            const body = req.body as any;
            const theme = body?.theme;

            if (theme !== 'light' && theme !== 'dark') {
                return reply.status(400).send({ error: 'Invalid theme. Must be light or dark' });
            }

            await preferencesRepository.updateTheme(userId, theme);

            req.log.info({ route: '/api/preferences', userId, theme }, 'theme updated');
            return reply.send({ ok: true, theme });
        } catch (error) {
            const userId = (req as any).userId as string | undefined;
            req.log.error({ route: '/api/preferences', userId, error }, 'unexpected error updating preferences');
            return reply.status(500).send({ error: 'Internal server error' });
        }
    });
}
