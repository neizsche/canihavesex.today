import { FastifyInstance } from 'fastify';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { LogRepository, logHasMeaningfulData } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { EngineService } from '../services/EngineService.js';
import {
  addDaysIso,
  backlogFloorIso,
  daysBetweenIso,
  isoToday,
  parseTimezoneOffsetMinutes,
} from '../utils/dates.js';
import { buildInsightCards } from '../utils/insights.js';
import { buildPatterns, type Phase } from '../utils/patterns.js';
import { computeReanchorFlags } from '../reanchor.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { cacheService } from '../services/CacheService.js';

export async function calendarRoutes(fastify: FastifyInstance, opts: { db: any }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const statusRepo = new DailyStatusRepository(opts.db);
  const logRepo = new LogRepository(opts.db);
  const cycleRepo = new CycleRepository(opts.db);
  const settingsRepo = new SettingsRepository(opts.db);
  const engineService = new EngineService(opts.db);
  const getTzOffsetMinutes = (req: any) =>
    parseTimezoneOffsetMinutes(req.headers['x-timezone-offset'] ?? req.headers['x-tz-offset']);

  // GET /api/v1/insights/today
  app.get('/api/v1/insights/today', async (req, reply) => {
    const userId = req.userId!;
    const tzOffsetMinutes = getTzOffsetMinutes(req);
    const today = isoToday(tzOffsetMinutes);

    const cacheKey = `user:${userId}:insights:today:v3`;
    const cachedResponse = cacheService.get<any>(cacheKey);
    if (cachedResponse) return cachedResponse;

    // Read today's cached status (recomputing if stale/missing), today's log, the
    // drift re-anchor state, and the user's cycles (for the active cycle start the
    // ack is scoped to).
    const [status, dailyLog, reanchorState, cycles] = await Promise.all([
      engineService.getFreshTodayStatus(userId, today),
      logRepo.getLog(userId, today),
      settingsRepo.getReanchorState(userId),
      cycleRepo.getCycleHistory(userId),
    ]);
    const dailyLogDone = logHasMeaningfulData(dailyLog);

    // Paused (break/pregnant) short-circuits everything — no prediction shown.
    if (reanchorState.paused) {
      const pausedResponse = {
        status: 'paused',
        insights: { today: {} },
        date: today,
        dailyLogDone,
      };
      cacheService.set(cacheKey, pausedResponse);
      return pausedResponse;
    }

    // No status means the user has no logs yet — engine produced nothing.
    if (!status) {
      return {
        status: 'unknown',
        insights: { today: {} },
        date: today,
        dailyLogDone,
      };
    }

    const insights = buildInsightCards(
      status.fertility_status,
      status.phase,
      status.insights_payload
    );

    // Drift re-anchor: the prompt reuses the existing lostTrack empty shell.
    const activeCycleStart = cycles.find((c) => !c.end_date)?.start_date ?? null;
    const reanchorFlags = computeReanchorFlags({
      lostTrack: !!insights?.today?.lostTrack,
      paused: false, // paused already short-circuited above
      ackKind: reanchorState.kind,
      ackCycleStart: reanchorState.cycleStart,
      activeCycleStart,
    });

    const response = {
      status: status.fertility_status,
      insights,
      date: status.date,
      lastModified: status.updated_at,
      dailyLogDone,
      reanchor: { show: reanchorFlags.show, acked: reanchorFlags.acked },
    };

    cacheService.set(cacheKey, response);
    return response;
  });

  // GET /api/v1/insights/calendar
  app.get(
    '/api/v1/insights/calendar',
    {
      schema: {
        querystring: z.object({
          start: z.string().optional(),
          end: z.string().optional(),
        }),
      },
    },
    async (req, reply) => {
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

      const [statuses, cycles, rangeLogs, reanchorState] = await Promise.all([
        statusRepo.getRangeStatus(userId, s, e),
        cycleRepo.getCycleHistory(userId),
        logRepo.getLogsInRange(userId, s, e),
        settingsRepo.getReanchorState(userId),
      ]);
      // Suppress forward predictions when paused or drifting (lost track): the
      // calendar then shows only logged history — no prediction colors for any
      // day after the last log date. Logged/confirmed days have is_predicted=false
      // so they always remain (logged data takes precedence over predictions).
      const paused = reanchorState.paused;
      const todayStatus = statuses.find((st) => st.date === today);
      const lostTrack = !!todayStatus?.insights_payload?.lostTrack;
      const suppressPredictions = paused || lostTrack;

      // Dates the user has actually logged something meaningful on, used to
      // surface a subtle "logged" marker on the calendar.
      const loggedDates = new Set(
        rangeLogs.filter((log) => logHasMeaningfulData(log)).map((log) => log.date)
      );

      // Helper: Find cycle overlapping the middle of the view
      const midDate = addDaysIso(s, Math.floor(daysBetweenIso(s, e) / 2));
      const cycle = cycles.find(
        (c) => c.start_date <= midDate && (!c.end_date || c.end_date >= midDate)
      );

      let quickStats = null;
      if (cycle) {
        const isActive = !cycle.end_date;

        // Format for Frontend (QuickStatsData)
        if (isActive) {
          // ACTIVE CYCLE (Current)
          const cycleDay = daysBetweenIso(cycle.start_date, today) + 1;
          let daysToPeriod = null;

          // Single source of truth: next period = cycle start + the engine's
          // predicted cycle length (ovulationDay + luteal, or its fallback).
          // The Today cycle line reads the same activeCycleLength, so the two
          // screens always show the same "days to period".
          const activeCycleLength =
            todayStatus?.insights_payload?.activeCycleLength ??
            todayStatus?.insights_payload?.stats?.medianCycleLength ??
            28;
          const periodDate = addDaysIso(cycle.start_date, activeCycleLength);
          daysToPeriod = daysBetweenIso(today, periodDate);

          const phaseName = todayStatus?.phase || 'Follicular';

          quickStats = {
            statusText: 'Current Cycle',
            subText: `Day ${cycleDay}`,
            isHistorical: false,
            periodStartDate: new Date(cycle.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            ovulationDate: cycle.ovulation_confirmed_date || cycle.ovulation_prediction || null,
            daysToPeriod: suppressPredictions ? null : daysToPeriod,
            cycleDay: cycleDay,
            fertilityStatus:
              todayStatus?.fertility_status === 'fertile'
                ? 'High'
                : todayStatus?.fertility_status === 'period'
                  ? 'Period'
                  : 'Low',
            phase: phaseName.includes('Phase') ? phaseName : `${phaseName} Phase`,
            isPredicted: suppressPredictions ? false : daysToPeriod !== null,
            lostTrack,
          };
        } else {
          // HISTORICAL CYCLE (Past Month View)
          quickStats = {
            statusText: 'Period Started',
            subText: new Date(cycle.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            isHistorical: true,
            periodStartDate: new Date(cycle.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            ovulationDate: cycle.ovulation_confirmed_date || cycle.ovulation_prediction || null,
            daysToPeriod: null,
            cycleDay: null,
            fertilityStatus: 'Low',
            phase: 'Luteal Phase',
            isPredicted: false,
            lostTrack: false,
          };
        }
      }

      // Map Days
      const todayStr = today;
      const days = statuses
        .map((st) => {
          const s = st.fertility_status === 'not_fertile' ? 'safe' : st.fertility_status;
          return { ...st, mappedStatus: s };
        })
        .filter((st) => ['period', 'fertile', 'safe'].includes(st.mappedStatus))
        // Paused or lost track: drop forward predictions (days after the last log
        // date), keeping only logged history.
        .filter((st) => !(suppressPredictions && st.is_predicted))
        .map((st) => {
          // Check if this date is a confirmed ovulation date in ANY cycle
          const isOvulation = cycles.some((c) => c.ovulation_confirmed_date === st.date);
          return {
            date: st.date,
            status: st.mappedStatus,
            ovulationConfirmed: isOvulation,
            hasLog: loggedDates.has(st.date),
            isToday: st.date === todayStr,
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
        minDate,
      };

      cacheService.set(cacheKey, response);
      return response;
    }
  );

  // GET /api/v1/insights/stats
  app.get('/api/v1/insights/stats', async (req, reply) => {
    const userId = req.userId!;
    const cacheKey = `user:${userId}:insights:stats`;
    const cachedResponse = cacheService.get<any>(cacheKey);
    if (cachedResponse) return cachedResponse;

    const cycles = await cycleRepo.getCycleHistory(userId);

    // Calculate averages
    const completedCycles = cycles.filter((c) => c.length);
    const len = completedCycles.reduce((acc, c) => acc + (c.length || 28), 0);
    const avg = completedCycles.length ? Math.round(len / completedCycles.length) : 28;

    const insufficientData = completedCycles.length < 3;

    // 1. Insufficient Data Case: Return minimal payload
    if (insufficientData) {
      const response = {
        insufficientData: true,
        trends: [
          {
            heading: 'Not Enough Data Yet',
            msg: 'Log at least 3 complete cycles to unlock detailed trends and history analysis.',
          },
        ],
      };
      cacheService.set(cacheKey, response);
      return response;
    }

    // 2. Sufficient Data: Calculate Trends
    const trends = [];

    // Trend A: Regularity
    const lengths = completedCycles.map((c) => c.length!);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    const variation = maxLen - minLen;

    if (variation <= 3) {
      trends.push({
        heading: 'Regular Cycles',
        msg: 'Your cycle lengths are consistent, varying by only ' + variation + ' days.',
      });
    } else {
      trends.push({
        heading: 'Variable Cycles',
        msg:
          'Your cycle lengths vary by ' +
          variation +
          ' days. This is normal but makes prediction harder.',
      });
    }

    // Trend B: Average Length
    trends.push({
      heading: 'Average Cycle',
      msg: `Your typical cycle is ${avg} days long.`,
    });

    // Summary derivations (Layer 1 — cycle summary grid). All pure
    // derivations of completedCycles already in scope; no new queries.
    const median = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    const periodLengths = completedCycles
      .map((c) => c.period_length)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    const avgPeriodLength = periodLengths.length
      ? Math.round(periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length)
      : null;

    const summary = {
      medianCycleLength: median(lengths),
      minCycleLength: minLen,
      maxCycleLength: maxLen,
      avgPeriodLength,
      variation,
      // Reuse the existing ≤3-day regularity threshold.
      regularityLabel: variation <= 3 ? 'Regular' : 'Variable',
    };

    // Layer 2 — body patterns by phase. Aggregate the namespaced symptom
    // logs over the last few completed cycles, bucketed by the engine's
    // already-computed phase (never recomputed here). Read-only.
    const recentCompleted = completedCycles.slice(0, 6); // cycles are sorted newest-first
    const windowStart = recentCompleted[recentCompleted.length - 1].start_date;
    const today = isoToday(getTzOffsetMinutes(req));
    const [patternLogs, patternStatuses] = await Promise.all([
      logRepo.getLogsSince(userId, windowStart),
      statusRepo.getRangeStatus(userId, windowStart, today),
    ]);
    const phaseByDate = new Map<string, Phase>(
      patternStatuses.map((s) => [s.date, s.phase as Phase])
    );
    const patterns = buildPatterns(patternLogs, phaseByDate);

    const response = {
      insufficientData: false,
      trends,
      summary,
      patterns,
      averages: {
        averageCycleLength: avg,
        cyclesTracked: completedCycles.length,
      },
      history: cycles.map((c) => {
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
          // `complete` lets the history list distinguish a finished
          // cycle from the in-progress current one (which has no length).
          complete: !!c.length,
          periodLength: c.period_length || 5,
          periodIntensity: 'medium',
          ovulationDay: ovDay,
          ovulationConfirmed: !!c.ovulation_confirmed_date,
        };
      }),
    };

    cacheService.set(cacheKey, response);
    return response;
  });
}
