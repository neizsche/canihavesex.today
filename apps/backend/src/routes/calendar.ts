import { FastifyInstance } from 'fastify';
import { DailyStatusRepository } from '../repositories/DailyStatusRepository.js';
import { LogRepository, logHasMeaningfulData } from '../repositories/LogRepository.js';
import { CycleRepository } from '../repositories/CycleRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { EngineService } from '../services/EngineService.js';
import { daysBetweenIso, isoToday, parseTimezoneOffsetMinutes } from '../utils/dates.js';
import { buildInsightCards } from '../utils/insights.js';
import { buildCalendarResponse } from '../utils/calendar.js';
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

    const cacheKey = `user:${userId}:insights:today:v4`;
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
      status.insights_payload,
      today
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
      const response = buildCalendarResponse({
        statuses,
        cycles,
        rangeLogs,
        paused: reanchorState.paused,
        today,
        start: s,
        end: e,
      });

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
        cyclesTracked: completedCycles.length,
      };
      cacheService.set(cacheKey, response);
      return response;
    }

    // 2. Sufficient Data
    const lengths = completedCycles.map((c) => c.length!);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    const variation = maxLen - minLen;

    // Headline — one warm, specific read of recent regularity, plus a coarse
    // direction (settling vs. drifting) the UI can accent. `lengths` is
    // newest-first, so slice(0, n) is the most recent window.
    const recent = lengths.slice(0, 6);
    const recentVar = Math.max(...recent) - Math.min(...recent);
    const older = lengths.slice(6, 12);
    let trend: 'steadier' | 'stable' | 'more variable' = 'stable';
    if (older.length >= 3) {
      const olderVar = Math.max(...older) - Math.min(...older);
      if (recentVar < olderVar - 1) trend = 'steadier';
      else if (recentVar > olderVar + 1) trend = 'more variable';
    }
    let headlineText: string;
    if (recentVar === 0) {
      headlineText = `Your last ${recent.length} cycles were all ${recent[0]} days.`;
    } else if (recentVar <= 4) {
      headlineText = `Steady — your last ${recent.length} cycles stayed within ${recentVar} days.`;
    } else {
      headlineText = `Your recent cycles varied by ${recentVar} days — some month-to-month change is normal.`;
    }
    const headline = { text: headlineText, trend };

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
      headline,
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
