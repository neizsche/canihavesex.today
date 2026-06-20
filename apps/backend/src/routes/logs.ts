import { FastifyInstance } from 'fastify';
import { LogService } from '../services/LogService.js';
import { BACKLOG_WINDOW_DAYS, isWithinBacklogWindow, isoToday, parseTimezoneOffsetMinutes } from '../utils/dates.js';
import { cacheService } from '../services/CacheService.js';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function logsRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const logService = new LogService(opts.db);
    
    const getTzOffsetMinutes = (req: any) =>
        parseTimezoneOffsetMinutes(req.headers['x-timezone-offset'] ?? req.headers['x-tz-offset']);

    // GET /api/v1/logs/:date
    app.get('/api/v1/logs/:date', {
        schema: {
            params: z.object({
                date: z.string()
            })
        }
    }, async (req, reply) => {
        const userId = req.userId!;
        const dateStr = req.params.date;
        const tzOffsetMinutes = getTzOffsetMinutes(req);
        const today = isoToday(tzOffsetMinutes);

        return await logService.getLogWithSuggestion(userId, dateStr, today);
    });



    // PUT /api/v1/logs/:date
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
        const userId = req.userId!;
        const tzOffsetMinutes = getTzOffsetMinutes(req);
        const today = isoToday(tzOffsetMinutes);

        // Edit lock: a day older than the back-log window is read-only. This is the
        // authoritative guard — the client disables it too, but a stale tab, a
        // deep link, or an API-key client could still try to write an old date.
        if (!isWithinBacklogWindow(req.params.date, today)) {
            return reply.code(422).send({
                error: 'date_out_of_range',
                message: `Entries can only be added or edited within the last ${BACKLOG_WINDOW_DAYS} days.`
            });
        }

        const result = await logService.upsertLogAndTriggerEngine({
            ...req.body,
            userId,
            date: req.params.date,
            authType: req.authType,
            today
        });
        cacheService.invalidateUser(userId);
        return result;
    });
}
