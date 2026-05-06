import { FastifyInstance } from 'fastify';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { UserMetaRepository } from '../repositories/UserMetaRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { runFusionEngine } from '../engine.js';
import { addDaysIso, daysBetweenIso, isoDateForOffset, isoToday, parseTimezoneOffsetMinutes } from '../utils/dates.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

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

        // Try fetch cache + today's log in parallel
        const [statusResult, dailyLog] = await Promise.all([
            statusRepo.getTodayStatus(userId, today),
            logRepo.getLog(userId, today)
        ]);
        let status = statusResult;

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
                    insights: {
                        today: { card: { title: "Welcome", description: "Log your first day" } }
                    },
                    date: today,
                    dailyLogDone: !!dailyLog
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

        return {
            status: status.fertility_status,
            insights,
            date: status.date,
            lastModified: status.updated_at,
            dailyLogDone: !!dailyLog
        };
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

        return {
            days,
            quickStats,
            minDate
        };
    });

    // GET /api/v1/insights/stats
    app.get('/api/v1/insights/stats', async (req, reply) => {
        const userId = req.userId!;
        const cycles = await cycleRepo.getCycleHistory(userId);

        // Calculate averages
        const completedCycles = cycles.filter(c => c.length);
        const len = completedCycles.reduce((acc, c) => acc + (c.length || 28), 0);
        const avg = completedCycles.length ? Math.round(len / completedCycles.length) : 28;

        const insufficientData = completedCycles.length < 3;

        // 1. Insufficient Data Case: Return minimal payload
        if (insufficientData) {
            return {
                insufficientData: true,
                trends: [
                    {
                        heading: "Not Enough Data Yet",
                        msg: "Log at least 3 complete cycles to unlock detailed trends and history analysis."
                    }
                ]
            };
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

        return {
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
                    ovDay = Math.floor((new Date(ovDate).getTime() - new Date(c.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
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
    });
}

// --- UI Card Builder (runs at request time, NOT stored in DB) ---
function buildInsightCards(fertilityStatus: string, phase: string, m: any) {
    if (!m || typeof m !== 'object') return m;

    const cycleDay = m.cycleDay ?? null;
    const confidenceScore = Math.round((m.confidenceScore ?? 0.3) * 100);
    const daysToOv = m.daysToOvulation;
    const s = m.stats || {};
    const avgLen = s.avgCycleLength ?? 28;
    const variation = s.variation ?? 0;
    const completedCycles = s.completedCycles ?? 0;

    // ── Status subtitle ──
    const statusTextMap: Record<string, string> = {
        fertile: 'Fertile Window',
        period: 'Period',
        unsure: 'Possibly Fertile',
        not_fertile: 'Low Fertility',
    };
    const statusText = statusTextMap[fertilityStatus] || 'Low Fertility';

    // ── Notifications (max 2, prioritised) ──
    const pool: string[] = [];

    // Highest priority: anomalies
    if (m.anomalies?.includes('Multiple LH Surges (PCOS Risk)'))
        pool.push('Multiple LH surges detected — talk to your doctor.');
    if (m.anomalies?.includes('Conflicting Bio-signals'))
        pool.push('Signals don\'t fully agree. Keep logging.');

    // Ovulation timing — only when close
    if (daysToOv === 0) pool.push('Ovulation day — peak fertility.');
    else if (daysToOv === 1) pool.push('Ovulation likely tomorrow.');
    else if (daysToOv !== null && daysToOv > 1 && daysToOv <= 5)
        pool.push(`Ovulation in ~${daysToOv} days.`);

    // Confirmation
    if (m.isConfirmed) pool.push('Ovulation confirmed via temp shift.');

    // Period countdown (late luteal only)
    if (phase === 'Luteal' && m.isConfirmed && cycleDay) {
        const daysToNextPeriod = avgLen - cycleDay;
        if (daysToNextPeriod > 0 && daysToNextPeriod <= 5)
            pool.push(`Period in ~${daysToNextPeriod} days.`);
    }

    // Temp exclusion
    if (m.tempReliability === 0) pool.push('Temp excluded (illness) — no impact on prediction.');

    // Gentle nudge — only if we have room and it's relevant
    if (pool.length < 2 && !m.hasTemp && fertilityStatus === 'fertile')
        pool.push('Log temp to help confirm ovulation.');

    const notifications = pool.slice(0, 2);

    // ── Source text (one short line) ──
    const sourceMap: Record<string, string> = {
        BBT: 'Anchored by temperature shift.',
        LH: 'Driven by LH surge.',
        MUCUS: 'Based on mucus pattern.',
        CALENDAR: 'Based on cycle history.',
    };
    const sourceText = sourceMap[m.primarySignal] || sourceMap.CALENDAR;

    // ── Confidence ──
    let confidenceLabel: string;
    let confidenceMessage: string;

    if (confidenceScore >= 85) {
        confidenceLabel = 'Very High';
        confidenceMessage = 'Strong signal agreement.';
    } else if (confidenceScore >= 70) {
        confidenceLabel = 'High';
        confidenceMessage = 'Consistent data this cycle.';
    } else if (confidenceScore >= 50) {
        confidenceLabel = 'Moderate';
        confidenceMessage = completedCycles < 3 ? 'Improving with more cycles.' : 'Add temp or LH for better accuracy.';
    } else {
        confidenceLabel = 'Building';
        confidenceMessage = 'More data will sharpen predictions.';
    }

    // ── Ovulation stat ──
    const ovulationStat = m.isConfirmed
        ? { label: 'Ovulation', value: 'Confirmed', variant: 'success' as const }
        : daysToOv !== null && daysToOv > 0 && daysToOv <= 14
            ? { label: 'Ovulation', value: `in ${daysToOv}d` }
            : { label: 'Ovulation', value: 'Pending' };

    const todayCard = {
        card: {
            title: 'TODAY',
            description: cycleDay ? `Day ${cycleDay}` : 'Day —',
            subtitle: statusText,
        },
        stats: [
            { label: 'Phase', value: phase },
            { label: 'Confidence', value: `${confidenceScore}%` },
            ovulationStat,
        ],
        notifications,
        sourceText,
        confidence: { label: confidenceLabel, score: confidenceScore, message: confidenceMessage },
    };

    // ── Cycle Stats Card ──
    const cycleSubtitle = completedCycles === 0
        ? 'First Cycle'
        : variation <= 2 ? 'Very Regular' : variation <= 4 ? 'Regular' : 'Variable';

    const cycleNotifications: string[] = [];
    if (completedCycles === 0) {
        cycleNotifications.push('Complete a cycle to see patterns.');
    } else if (completedCycles < 3) {
        cycleNotifications.push(`${3 - completedCycles} more cycle${3 - completedCycles > 1 ? 's' : ''} for reliable trends.`);
    } else if (variation > 4) {
        cycleNotifications.push('Variable cycles widen the prediction window.');
    }
    if ((s.loggingRate ?? 0) >= 80) cycleNotifications.push('Great logging consistency.');
    else if ((s.loggingRate ?? 0) > 0 && (s.loggingRate ?? 0) < 50) cycleNotifications.push('More frequent logging improves accuracy.');

    const cycleStatsConfScore = Math.min(100, completedCycles * 25);

    const cycleStatsCard = {
        card: {
            title: 'CYCLE STATS',
            description: `${avgLen} Days`,
            subtitle: cycleSubtitle,
        },
        stats: [
            { label: 'Variation', value: variation === 0 ? 'None' : `±${variation}d` },
            { label: 'Logged', value: `${s.loggingRate ?? 0}%` },
            { label: 'Period', value: s.avgPeriodLength ? `${s.avgPeriodLength}d avg` : '—' },
            { label: 'Gaps', value: (s.maxGap ?? 0) <= 1 ? 'None' : `${s.maxGap}d` },
        ],
        sourceText: completedCycles === 0
            ? 'Start logging to build your profile.'
            : `From ${completedCycles} completed cycle${completedCycles > 1 ? 's' : ''}.`,
        notifications: cycleNotifications.slice(0, 2),
        confidence: {
            label: cycleStatsConfScore >= 75 ? 'Strong' : cycleStatsConfScore >= 40 ? 'Growing' : 'New',
            score: cycleStatsConfScore,
            message: cycleStatsConfScore >= 75 ? 'Enough data for reliable trends.' : 'More cycles will improve insights.',
        },
    };

    // ── Nutrition Card (Locked) ──
    const nutritionCard = {
        card: { title: 'NUTRITION', description: 'Calcium Intake', subtitle: 'Premium', isLocked: true, lockLabel: 'Premium' },
        stats: [],
        sourceText: 'Phase-based nutrition guidance.',
    };

    return { today: todayCard, 'cycle-stats': cycleStatsCard, nutrition: nutritionCard };
}

