import { FastifyInstance } from 'fastify';
import { LogService } from '../services/LogService.js';
import {
  BACKLOG_WINDOW_DAYS,
  isWithinBacklogWindow,
  isoToday,
  parseTimezoneOffsetMinutes,
} from '../utils/dates.js';
import { cacheService } from '../services/CacheService.js';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function logsRoutes(fastify: FastifyInstance, opts: { db: any }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const logService = new LogService(opts.db);

  const getTzOffsetMinutes = (req: any) =>
    parseTimezoneOffsetMinutes(req.headers['x-timezone-offset'] ?? req.headers['x-tz-offset']);

  // GET /api/v1/logs/:date
  app.get(
    '/api/v1/logs/:date',
    {
      schema: {
        params: z.object({
          date: z.string(),
        }),
      },
    },
    async (req, reply) => {
      const userId = req.userId!;
      const dateStr = req.params.date;
      const tzOffsetMinutes = getTzOffsetMinutes(req);
      const today = isoToday(tzOffsetMinutes);

      return await logService.getLogWithSuggestion(userId, dateStr, today);
    }
  );

  // PUT /api/v1/logs/:date
  app.put(
    '/api/v1/logs/:date',
    {
      schema: {
        params: z.object({
          date: z.string(),
        }),
        body: z.object({
          date: z.string(),
          // Enums mirror the DB CHECK constraints (migration v2) plus the UI
          // sentinels the server normalizes to NULL in LogService
          // (`'none'` bleeding, `'notTaken'` LH). Keeping the app layer as strict
          // as the storage layer turns a bad value into a clean 400 instead of a
          // DB constraint violation surfaced as a 500.
          bleeding: z.enum(['none', 'spotting', 'light', 'medium', 'heavy']).nullable().optional(),
          temperature: z.number().min(34).max(42).nullable().optional(),
          mucusType: z
            .enum(['dry', 'sticky', 'creamy', 'watery', 'eggwhite'])
            .nullable()
            .optional(),
          lhTest: z.enum(['positive', 'negative', 'notTaken']).nullable().optional(),
          // Bounded to prevent unbounded storage from a single authenticated user.
          disturbances: z.array(z.string().max(64)).max(50).optional(),
          symptoms: z.array(z.string().max(64)).max(100).optional(),
          notes: z.string().max(2000).nullable().optional(),
        }),
      },
    },
    async (req, reply) => {
      const userId = req.userId!;
      const tzOffsetMinutes = getTzOffsetMinutes(req);
      const today = isoToday(tzOffsetMinutes);

      // Edit lock: a day older than the back-log window is read-only. This is the
      // authoritative guard — the client disables it too, but a stale tab, a
      // deep link, or an API-key client could still try to write an old date.
      if (!isWithinBacklogWindow(req.params.date, today)) {
        return reply.code(422).send({
          error: 'date_out_of_range',
          message: `Entries can only be added or edited within the last ${BACKLOG_WINDOW_DAYS} days.`,
        });
      }
      // Note: the demo account is restricted to logging *today* by the central
      // demo write-guard in index.ts — no per-route check needed here.

      const result = await logService.upsertLogAndTriggerEngine({
        ...req.body,
        userId,
        date: req.params.date,
        today,
      });
      cacheService.invalidateUser(userId);
      return result;
    }
  );
}
