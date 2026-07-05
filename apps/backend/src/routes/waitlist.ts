import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { WaitlistRepository } from '../repositories/WaitlistRepository.js';
import { evaluateWaitlistSubmission } from '../waitlist.js';

/**
 * Pre-launch email capture. Public + unauthenticated (see the public-route
 * exemption in plugins/auth.ts and the CSRF/CORS exemptions in index.ts): it is
 * posted to from the marketing site (cross-origin) and from the in-app demo
 * prompt (same-origin).
 *
 * Privacy/anti-abuse posture:
 *  - Always returns 200 for a well-formed request, whether or not the address was
 *    new — signups cannot be enumerated.
 *  - Requires an explicit consent flag (the form's opt-in checkbox).
 *  - A hidden honeypot field silently drops bot submissions.
 *  - IP rate-limiting is applied globally by the default limiter in index.ts.
 */
export async function waitlistRoutes(fastify: FastifyInstance, opts: { db: any }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const repo = new WaitlistRepository(opts.db);

  app.post(
    '/api/waitlist',
    {
      schema: {
        body: z.object({
          email: z.string().trim().email().max(320),
          // Where the signup came from: 'demo' | 'footer' | 'hero' | ...
          source: z.string().max(40).optional(),
          // Optional free-text/persona context (e.g. 'avoider'). Kept small.
          reason: z.string().max(500).optional(),
          // Explicit opt-in. Must be true — no consent, no store.
          consent: z.boolean(),
          // Honeypot: real users never fill this hidden field. Bots often do.
          website: z.string().max(0).optional().or(z.string().optional()),
        }),
      },
    },
    async (req, reply) => {
      const { email, source, reason, consent, website } = req.body;

      const outcome = evaluateWaitlistSubmission({ email, consent, website });

      // Honeypot tripped: pretend success so the bot gets no signal.
      if (outcome.action === 'drop') {
        return reply.send({ ok: true });
      }

      if (outcome.action === 'reject') {
        return reply.status(400).send({
          error: outcome.error,
          message: 'Please agree to be emailed about the launch.',
        });
      }

      try {
        await repo.add({ email: outcome.email, source: source ?? null, reason: reason ?? null });
      } catch (err) {
        // Never leak storage details; log for ops and return a generic 200 so the
        // form UX stays calm. A transient DB blip shouldn't scare a signup away.
        req.log.error({ err, route: 'waitlist' }, 'waitlist insert failed');
      }

      return reply.send({ ok: true });
    }
  );
}
