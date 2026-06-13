import { FastifyInstance } from 'fastify';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { LogRepository, logHasMeaningfulData } from '../repositories/LogRepository.js';
import { UserMetaRepository } from '../repositories/UserMetaRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { runFusionEngine } from '../engine.js';
import { addDaysIso, daysBetweenIso, isoDateForOffset, isoToday, parseTimezoneOffsetMinutes } from '../utils/dates.js';
import { buildInsightCards } from '../utils/insights.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cacheService } from '../services/CacheService.js';

export async function calendarRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const statusRepo = new DailyStatusRepository(opts.db);
    const logRepo = new LogRepository(opts.db);
    const metaRepo = new UserMetaRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const userRepo = new UserRepository(opts.db);
    const getTzOffsetMinutes = (req: any) =>
        parseTimezoneOffsetMinutes(req.headers['x-timezone-offset'] ?? req.headers['x-tz-offset']);

    // GET /api/v1/insights/today
    app.get('/api/v1/insights/today', async (req, reply) => {
        const userId = req.userId!;
        const tzOffsetMinutes = getTzOffsetMinutes(req);
        const today = isoToday(tzOffsetMinutes);

        const cacheKey = `user:${userId}:insights:today:v2`;
        const cachedResponse = cacheService.get<any>(cacheKey);
        if (cachedResponse) return cachedResponse;

        // Try fetch cache + today's log in parallel
        const [statusResult, dailyLog] = await Promise.all([
            statusRepo.getTodayStatus(userId, today),
            logRepo.getLog(userId, today)
        ]);
        let status = statusResult;
        const dailyLogDone = logHasMeaningfulData(dailyLog);

        // Recompute only when logs change (or cache is missing)
        let shouldRecompute = !status;
        if (!shouldRecompute) {
            const latestLogUpdatedAt = await logRepo.getLatestUpdateTimestamp(userId);
            if (!latestLogUpdatedAt) {
                shouldRecompute = true;
            } else if (status?.updated_at) {
                const logUpdatedMs = new Date(latestLogUpdatedAt).getTime();
                const statusUpdatedMs = new Date(status.updated_at).getTime();
                if (logUpdatedMs > statusUpdatedMs) shouldRecompute = true;
            }
        }

        if (shouldRecompute) {
            // Cold start or stale cache: run engine
            const existingCycles = await cycleRepo.getCycleHistory(userId);
            
            // Optimization: Fetch logs since the start of the 3rd most recent cycle
            // to ensure we have enough context for analysis, but don't fetch everything.
            // If we have fewer than 3 cycles, fetch from 120 days ago.
            let lookbackDate = addDaysIso(today, -120);
            if (existingCycles.length >= 3) {
                lookbackDate = existingCycles[2].start_date;
            } else if (existingCycles.length > 0) {
                lookbackDate = existingCycles[existingCycles.length - 1].start_date;
            }

            const [logs, meta] = await Promise.all([
                logRepo.getLogsSince(userId, lookbackDate),
                metaRepo.getUserMeta(userId)
            ]);

            // If NO logs, return empty state
            if (!logs.length) {
                return {
                    status: 'unknown',
                    insights: { today: {} },
                    date: today,
                    dailyLogDone
                };
            }

            try {
                const result = runFusionEngine(userId, { logs, meta, existingCycles, today });
                await statusRepo.saveDailyStatuses(result.statuses);
                await cycleRepo.upsertCycles(result.cycles);
                status = await statusRepo.getTodayStatus(userId, today);
            } catch (error) {
                console.error("GET /api/today Engine Error:", error);
                return { error: "Engine Failed", details: String(error) };
            }
        }

        if (!status) return { error: "Engine failed to produce status" };

        // --- Build UI cards on-the-fly from lean metadata ---
        const m = status.insights_payload; // Raw metadata from engine
        const insights = buildInsightCards(status.fertility_status, status.phase, m);

        const response = {
            status: status.fertility_status,
            insights,
            date: status.date,
            lastModified: status.updated_at,
            dailyLogDone
        };

        cacheService.set(cacheKey, response);
        return response;
    });

    // GET /api/v1/insights/calendar
    app.get('/api/v1/insights/calendar', {
        schema: {
            querystring: z.object({
                start: z.string().optional(),
                end: z.string().optional()
            })
        }
    }, async (req, reply) => {
        const userId = req.userId!;
        const { start, end } = req.query;
        const tzOffsetMinutes = getTzOffsetMinutes(req);
        const today = isoToday(tzOffsetMinutes);
        // Default range if missing
        const s = start || today;
        const e = end || s;

        const cacheKey = `user:${userId}:calendar:${s}:${e}`;
        const cachedResponse = cacheService.get<any>(cacheKey);
        if (cachedResponse) return cachedResponse;

        const [statuses, cycles, user] = await Promise.all([
            statusRepo.getRangeStatus(userId, s, e),
            cycleRepo.getCycleHistory(userId),
            userRepo.findById(userId)
        ]);

        // Helper: Find cycle overlapping the middle of the view
        const midDate = addDaysIso(s, Math.floor(daysBetweenIso(s, e) / 2));
        const cycle = cycles.find(c => c.start_date <= midDate && (!c.end_date || c.end_date >= midDate));

        let quickStats = null;
        if (cycle) {
            const isActive = !cycle.end_date;

            // Format for Frontend (QuickStatsData)
            if (isActive) {
                // ACTIVE CYCLE (Current)
                const cycleDay = daysBetweenIso(cycle.start_date, today) + 1;
                let daysToPeriod = null;
                if (cycle.ovulation_prediction) {
                    const periodDate = addDaysIso(cycle.ovulation_prediction, 14);
                    daysToPeriod = daysBetweenIso(today, periodDate);
                }

                // Get today's status for the card
                const todayStatus = statuses.find(st => st.date === today);
                const phaseName = todayStatus?.phase || 'Follicular';

                quickStats = {
                    statusText: 'Current Cycle',
                    subText: `Day ${cycleDay}`,
                    isHistorical: false,
                    periodStartDate: new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    ovulationDate: cycle.ovulation_confirmed_date || cycle.ovulation_prediction || null,
                    daysToPeriod: daysToPeriod,
                    cycleDay: cycleDay,
                    fertilityStatus: todayStatus?.fertility_status === 'fertile' ? 'High' : (todayStatus?.fertility_status === 'period' ? 'Period' : 'Low'),
                    phase: phaseName.includes('Phase') ? phaseName : `${phaseName} Phase`,
                    isPredicted: daysToPeriod !== null
                };
            } else {
                // HISTORICAL CYCLE (Past Month View)
                quickStats = {
                    statusText: 'Period Started',
                    subText: new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    isHistorical: true,
                    periodStartDate: new Date(cycle.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    ovulationDate: cycle.ovulation_confirmed_date || cycle.ovulation_prediction || null,
                    daysToPeriod: null,
                    cycleDay: null,
                    fertilityStatus: 'Low',
                    phase: 'Luteal Phase',
                    isPredicted: false
                };
            }
        }

        // Map Days
        const todayStr = today;
        const days = statuses
            .map(st => {
                const s = st.fertility_status === 'not_fertile' ? 'safe' : st.fertility_status;
                return { ...st, mappedStatus: s };
            })
            .filter(st => ['period', 'fertile', 'safe'].includes(st.mappedStatus))
            .map(st => {
                // Check if this date is a confirmed ovulation date in ANY cycle
                const isOvulation = cycles.some(c => c.ovulation_confirmed_date === st.date);
                return {
                    date: st.date,
                    status: st.mappedStatus,
                    ovulationConfirmed: isOvulation,
                    isToday: st.date === todayStr
                };
            });

        // Calculate minDate for swipe restriction
        // Earliest of: Account Creation Date OR First Logged Period
        let minDate = user?.created_at ? isoDateForOffset(new Date(user.created_at), tzOffsetMinutes) : '2024-01-01';

        if (cycles.length > 0) {
            // Cycles are usually ordered or we can find the min start_date
            // Assuming we need to check all cycles to find absolute min
            const earliestCycleStart = cycles.reduce((min, c) => {
                if (!c.start_date) return min;
                return c.start_date < min ? c.start_date : min;
            }, minDate);

            if (earliestCycleStart < minDate) {
                minDate = earliestCycleStart;
            }
        }

        const response = {
            days,
            quickStats,
            minDate
        };

        cacheService.set(cacheKey, response);
        return response;
    });

    // GET /api/v1/insights/stats
    app.get('/api/v1/insights/stats', async (req, reply) => {
        const userId = req.userId!;
        const cacheKey = `user:${userId}:insights:stats`;
        const cachedResponse = cacheService.get<any>(cacheKey);
        if (cachedResponse) return cachedResponse;

        const cycles = await cycleRepo.getCycleHistory(userId);

        // Calculate averages
        const completedCycles = cycles.filter(c => c.length);
        const len = completedCycles.reduce((acc, c) => acc + (c.length || 28), 0);
        const avg = completedCycles.length ? Math.round(len / completedCycles.length) : 28;

        const insufficientData = completedCycles.length < 3;

        // 1. Insufficient Data Case: Return minimal payload
        if (insufficientData) {
            const response = {
                insufficientData: true,
                trends: [
                    {
                        heading: "Not Enough Data Yet",
                        msg: "Log at least 3 complete cycles to unlock detailed trends and history analysis."
                    }
                ]
            };
            cacheService.set(cacheKey, response);
            return response;
        }

        // 2. Sufficient Data: Calculate Trends
        const trends = [];

        // Trend A: Regularity
        const lengths = completedCycles.map(c => c.length!);
        const minLen = Math.min(...lengths);
        const maxLen = Math.max(...lengths);
        const variation = maxLen - minLen;

        if (variation <= 3) {
            trends.push({
                heading: "Regular Cycles",
                msg: "Your cycle lengths are consistent, varying by only " + variation + " days."
            });
        } else {
            trends.push({
                heading: "Variable Cycles",
                msg: "Your cycle lengths vary by " + variation + " days. This is normal but makes prediction harder."
            });
        }

        // Trend B: Average Length
        trends.push({
            heading: "Average Cycle",
            msg: `Your typical cycle is ${avg} days long.`
        });

        const response = {
            insufficientData: false,
            trends,
            averages: {
                averageCycleLength: avg,
                cyclesTracked: completedCycles.length
            },
            history: cycles.map(c => {
                // Calculate ovulation day offset
                let ovDay = 14;
                const ovDate = c.ovulation_confirmed_date || c.ovulation_prediction;
                if (ovDate && c.start_date) {
                    ovDay = daysBetweenIso(c.start_date, ovDate) + 1;
                }

                return {
                    id: c.id,
                    startDate: c.start_date,
                    length: c.length || 28, // Default if active/unknown
                    periodLength: c.period_length || 5,
                    periodIntensity: 'medium',
                    ovulationDay: ovDay,
                    ovulationConfirmed: !!c.ovulation_confirmed_date
                };
            })
        };

        cacheService.set(cacheKey, response);
        return response;
    });
}

