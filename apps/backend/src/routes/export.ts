import { FastifyInstance } from 'fastify';
import { LogRepository } from '../repositories/LogRepository.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function exportRoutes(fastify: FastifyInstance, opts: { db: any }) {
    const app = fastify.withTypeProvider<ZodTypeProvider>();
    const logRepo = new LogRepository(opts.db);

    app.get('/api/export', {
        schema: {
            querystring: z.object({
                includeNotes: z.string().optional()
            })
        }
    }, async (req, reply) => {
        const userId = (req as any).userId;
        const includeNotes = req.query.includeNotes === 'true';

        const logs = await logRepo.getAllLogs(userId);

        // Sort logs by date descending
        logs.sort((a, b) => b.date.localeCompare(a.date));

        // CSV Construction
        let csv = '';

        // Branding & Upsell
        csv += 'Exported from canihavesex.today\n';
        csv += 'Unlock deeper insights and PDF reports with Premium\n\n';

        // Headers
        csv += 'Date,Bleeding,Temperature,Mucus,LH Test,Disturbances,Symptoms';
        if (includeNotes) {
            csv += ',Notes';
        }
        csv += '\n';

        // CSV Rows
        for (const log of logs) {
            const date = log.date;
            const bleeding = log.bleeding || '';
            const temperature = log.temperature || '';
            const mucus = log.mucus || '';
            const lhTest = log.lh_test || '';
            // Arrays need specific handling (e.g. pipe joined or space joined)
            const disturbances = (log.disturbances || []).join('; ');
            const symptoms = (log.symptoms || []).join('; ');

            let row = `${date},${bleeding},${temperature},${mucus},${lhTest},"${disturbances}","${symptoms}"`;

            if (includeNotes) {
                // Escape quotes in notes
                const cleanNotes = (log.notes || '').replace(/"/g, '""');
                row += `,"${cleanNotes}"`;
            }

            csv += row + '\n';
        }

        reply.header('Content-Type', 'text/csv');
        // Discrete filename
        reply.header('Content-Disposition', 'attachment; filename="health-data.csv"');
        return csv;
    });
}
