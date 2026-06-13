import { FastifyInstance } from 'fastify';
import { LogService } from '../services/LogService.js';
import { isoToday, parseTimezoneOffsetMinutes } from '../utils/dates.js';
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
