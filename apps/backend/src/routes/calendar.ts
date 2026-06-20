import { FastifyInstance } from 'fastify';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { LogRepository, logHasMeaningfulData } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { EngineService } from '../services/EngineService.js';
import { addDaysIso, backlogFloorIso, daysBetweenIso, isoToday, parseTimezoneOffsetMinutes } from '../utils/dates.js';
import { buildInsightCards } from '../utils/insights.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cacheService } from '../services/CacheService.js';

export async function calendarRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const statusRepo = new DailyStatusRepository(opts.db);
    const logRepo = new LogRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);
    const engineService = new EngineService(opts.db);
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

        // Read today's cached status (recomputing if stale/missing) + today's log.
        const [status, dailyLog] = await Promise.all([
            engineService.getFreshTodayStatus(userId, today),
            logRepo.getLog(userId, today)
        ]);
        const dailyLogDone = logHasMeaningfulData(dailyLog);

        // No status means the user has no logs yet — engine produced nothing.
        if (!status) {
            return {
                status: 'unknown',
                insights: { today: {} },
                date: today,
                dailyLogDone
            };
        }

        const insights = buildInsightCards(status.fertility_status, status.phase, status.insights_payload);

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

        const [statuses, cycles] = await Promise.all([
            statusRepo.getRangeStatus(userId, s, e),
            cycleRepo.getCycleHistory(userId)
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

                // Get today's status for the card
                const todayStatus = statuses.find(st => st.date === today);

                if (cycle.ovulation_prediction) {
                    // Luteal phase is ~14 days, period starts on the 15th day after ovulation
                    const periodDate = addDaysIso(cycle.ovulation_prediction, 15);
                    daysToPeriod = daysBetweenIso(today, periodDate);
                } else {
                    const predictedLength = todayStatus?.insights_payload?.stats?.medianCycleLength || 28;
                    const periodDate = addDaysIso(cycle.start_date, predictedLength);
                    daysToPeriod = daysBetweenIso(today, periodDate);
                }

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

        // minDate for swipe restriction. Floor is the back-log window so a
        // first-time user mid-cycle can still reach her last period; extended
        // further back when older logged cycles exist, so history stays viewable
        // (viewing is unrestricted — only editing is locked to the window).
        let minDate = backlogFloorIso(today);

        if (cycles.length > 0) {
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

