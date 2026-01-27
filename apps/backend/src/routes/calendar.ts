import { FastifyInstance } from 'fastify';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { UserMetaRepository } from '../repositories/UserMetaRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { runFusionEngine } from '../engine.js';

export async function calendarRoutes(app: FastifyInstance, opts: { db: any }) {
    const statusRepo = new DailyStatusRepository(opts.db);
    const logRepo = new LogRepository(opts.db);
    const metaRepo = new UserMetaRepository(opts.db);
    const cycleRepo = new CycleRepository(opts.db);

    // GET /api/today
    app.get('/api/today', async (req, reply) => {
        const userId = (req as any).userId;
        const today = new Date().toISOString().split('T')[0];

        // Try fetch cache
        let status = null; // FORCE REFRESH for verification
        // let status = await repo.getTodayStatus(userId, today);

        if (!status) {
            // Cold start: run engine just in case
            const logs = await logRepo.getAllLogs(userId);
            // If NO logs, return empty state
            if (!logs.length) {
                return {
                    status: 'unknown',
                    insights: {
                        today: { card: { title: "Welcome", description: "Log your first day" } }
                    },
                    date: today
                };
            }

            const meta = await metaRepo.getUserMeta(userId);
            const existingCycles = await cycleRepo.getCycleHistory(userId);
            try {
                // @ts-ignore
                const result = runFusionEngine(userId, { logs, meta, existingCycles });
                await statusRepo.saveDailyStatuses(result.statuses);
                await cycleRepo.upsertCycles(result.cycles);
                status = await statusRepo.getTodayStatus(userId, today);
            } catch (error) {
                console.error("GET /api/today Engine Error:", error);
                return { error: "Engine Failed", details: String(error) };
            }
        }

        if (!status) return { error: "Engine failed to produce status" };

        return {
            status: status.fertility_status,
            insights: status.insights_payload,
            date: status.date,
            lastModified: status.updated_at
        };
    });

    // GET /api/calendar
    app.get<{ Querystring: { start: string; end: string } }>('/api/calendar', async (req, reply) => {
        const userId = (req as any).userId;
        const { start, end } = req.query;
        // Default range if missing
        const s = start || new Date().toISOString().split('T')[0];
        const e = end || s;

        const [statuses, cycles] = await Promise.all([
            statusRepo.getRangeStatus(userId, s, e),
            cycleRepo.getCycleHistory(userId)
        ]);

        // Helper: Find cycle overlapping the middle of the view
        const midDate = new Date(new Date(s).getTime() + (new Date(e).getTime() - new Date(s).getTime()) / 2).toISOString().slice(0, 10);
        const cycle = cycles.find(c => c.start_date <= midDate && (!c.end_date || c.end_date >= midDate));

        let quickStats = null;
        if (cycle) {
            const today = new Date().toISOString().split('T')[0];
            const isActive = !cycle.end_date;

            // Format for Frontend (QuickStatsData)
            if (isActive) {
                // ACTIVE CYCLE (Current)
                const cycleDay = Math.floor((new Date(today).getTime() - new Date(cycle.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                let daysToPeriod = null;
                if (cycle.ovulation_prediction) {
                    const ovDate = new Date(cycle.ovulation_prediction);
                    const periodDate = new Date(ovDate.getTime() + (14 * 24 * 60 * 60 * 1000));
                    daysToPeriod = Math.ceil((periodDate.getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
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
        const todayStr = new Date().toISOString().split('T')[0];
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

        return {
            days,
            quickStats
        };
    });

    // GET /api/stats
    app.get('/api/stats', async (req, reply) => {
        const userId = (req as any).userId;
        const cycles = await cycleRepo.getCycleHistory(userId);

        // Calculate averages
        const completedCycles = cycles.filter(c => c.length);
        const len = completedCycles.reduce((acc, c) => acc + (c.length || 28), 0);
        const avg = completedCycles.length ? Math.round(len / completedCycles.length) : 28;

        return {
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
