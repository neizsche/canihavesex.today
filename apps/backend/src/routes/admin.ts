import { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { seedDemoAccount } from '../scripts/seedDemo.js';
import { isDemoAccountEnabled } from '../demo.js';

/**
 * Operational endpoints meant for a scheduler/cron, not the browser. They are
 * exempt from cookie auth (they carry their own shared secret) and from the
 * CSRF custom-header check — see the skip lists in index.ts / plugins/auth.ts.
 */
export async function adminRoutes(fastify: FastifyInstance, opts: { db: any }) {
    // POST /api/admin/reseed-demo — rebuilds the shared demo account to a clean
    // ~6 months of history. Intended to run on a schedule (e.g. Cloud Scheduler)
    // so visitor scribbles are wiped and the "today" anchor stays fresh. Guarded
    // by DEMO_RESEED_SECRET; the seed keeps the same demo user id, so anyone
    // mid-tour is not logged out.
    fastify.post('/api/admin/reseed-demo', async (req, reply) => {
        const configured = process.env.DEMO_RESEED_SECRET ?? '';
        // Disabled unless both the demo and a reseed secret are configured.
        if (!isDemoAccountEnabled() || configured.length === 0) {
            return reply.status(404).send({ error: 'not_found' });
        }

        const provided = (req.headers['x-admin-secret'] as string | undefined) ?? '';
        const a = Buffer.from(provided);
        const b = Buffer.from(configured);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return reply.status(401).send({ error: 'unauthorized' });
        }

        const result = await seedDemoAccount(opts.db);
        req.log.info({ result }, '[admin] demo account reseeded');
        return reply.send({ ok: true, ...result });
    });
}
