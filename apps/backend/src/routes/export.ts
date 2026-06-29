import { FastifyInstance } from 'fastify';
import { LogRepository } from '../repositories/LogRepository.js';

import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

export async function exportRoutes(fastify: FastifyInstance, opts: { db: any }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const logRepo = new LogRepository(opts.db);

  app.get('/api/v1/user/export', async (req, reply) => {
    const userId = req.userId!;
    const logs = await logRepo.getAllLogs(userId);

    // Sort logs by date descending
    logs.sort((a, b) => b.date.localeCompare(a.date));

    // CSV Construction
    let csv = '';

    // Branding & Upsell
    csv += 'Exported from canihavesex.today\n';
    csv += 'Unlock deeper insights and PDF reports with Premium\n\n';

    // Headers
    csv += 'Date,Bleeding,Temperature,Mucus,LH Test,Disturbances,Symptoms,Notes\n';

    // CSV Rows
    const escapeFormula = (val: string) => {
      if (/^[=+\-@]/.test(val)) return `'${val}`;
      return val;
    };

    for (const log of logs) {
      const date = log.date;
      const bleeding = escapeFormula(log.bleeding || '');
      const temperature = log.temperature || '';
      const mucus = escapeFormula(log.mucus || '');
      const lhTest = escapeFormula(log.lh_test || '');
      // Arrays need specific handling (e.g. pipe joined or space joined)
      const disturbances = escapeFormula((log.disturbances || []).join('; ')).replace(/"/g, '""');
      const symptoms = escapeFormula((log.symptoms || []).join('; ')).replace(/"/g, '""');
      const cleanNotes = escapeFormula(log.notes || '').replace(/"/g, '""');

      const row = `${date},${bleeding},${temperature},${mucus},${lhTest},"${disturbances}","${symptoms}","${cleanNotes}"`;

      csv += row + '\n';
    }

    reply.header('Content-Type', 'text/csv');
    // Discrete filename
    reply.header('Content-Disposition', 'attachment; filename="health-data.csv"');
    return csv;
  });
}
