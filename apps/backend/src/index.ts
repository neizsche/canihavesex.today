import Fastify, { FastifyInstance } from 'fastify';
import * as Sentry from '@sentry/node';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import rawBody from 'fastify-raw-body';
import fastifyStatic from '@fastify/static';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
  hasZodFastifySchemaValidationErrors,
} from 'fastify-type-provider-zod';

import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { createRateLimitMiddleware } from './rateLimiter.js';
import { loadEnv } from './env.js';
import { UserRepository } from './repositories/UserRepository.js';
import { SettingsRepository } from './repositories/SettingsRepository.js';
import { EmailVerificationRepository } from './repositories/EmailVerificationRepository.js';
import { SubscriptionRepository } from './repositories/SubscriptionRepository.js';
import { BillingEventRepository } from './repositories/BillingEventRepository.js';
import { EmailVerificationService } from './services/EmailVerificationService.js';
import { EntitlementService } from './services/EntitlementService.js';
import { isBillingEnabled } from './entitlement.js';
import { isSelfHost, shouldBypassHttpsRedirect, DEMO_EMAIL, isDemoAccountEnabled } from './config.js';
import { isoToday } from './utils/dates.js';
import { createDodoProviderFromEnv } from './billing/DodoProvider.js';
import { sendVerificationEmail, sendPurchaseConfirmationEmail } from './email.js';
import { isEmailVerificationEnabled } from './emailVerification.js';
import authPlugin from './plugins/auth.js';

import { authRoutes } from './routes/auth.js';
import { logsRoutes } from './routes/logs.js';
import { calendarRoutes } from './routes/calendar.js';
import { exportRoutes } from './routes/export.js';
import { userRoutes } from './routes/user.js';
import { adminRoutes } from './routes/admin.js';
import { billingRoutes } from './routes/billing.js';

loadEnv();

const shouldPrettyLog =
  process.env.PRETTY_LOGS === '1' ||
  (process.env.PRETTY_LOGS !== '0' &&
    process.env.NODE_ENV !== 'production' &&
    !!process.stdout.isTTY);

export async function createApp() {
  const app = Fastify({
    // In production we typically run behind a reverse proxy (Fly/Render/NGINX/etc).
    // Trust proxy headers so req.ip / protocol are derived correctly.
    trustProxy: process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production',
    logger: {
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      ...(shouldPrettyLog
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
                singleLine: true,
              },
            },
          }
        : {}),
    },
    disableRequestLogging: true,
    genReqId: () => randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.addHook('onRequest', async (req, reply) => {
    (req as any).__startAt = process.hrtime.bigint();

    // Security Headers (H1)
    reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // Enforce HTTPS in production (exempting /health for local/container healthchecks, and when self-hosted or explicitly disabled)
    if (process.env.NODE_ENV === 'production' && !shouldBypassHttpsRedirect()) {
      const path = req.url.split('?')[0] ?? req.url;
      if (path !== '/health') {
        const xfProto = (req.headers['x-forwarded-proto'] as string | undefined)
          ?.split(',')[0]
          ?.trim();
        const proto = xfProto || (req as any).protocol;
        if (proto && proto !== 'https') {
          return reply.redirect(`https://${req.headers.host}${req.url}`);
        }
      }
    }

    req.log.info(
      {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      'incoming request'
    );
  });

  app.addHook('onResponse', async (req, reply) => {
    const startAt = (req as any).__startAt as bigint | undefined;
    const durationMs = startAt
      ? Number((process.hrtime.bigint() - startAt) / 1_000_000n)
      : undefined;
    const userId = (req as any).userId as string | undefined;

    req.log.info(
      {
        method: req.method,
        url: req.url,
        statusCode: reply.statusCode,
        durationMs,
        userId,
      },
      'request completed'
    );
  });

  app.setErrorHandler((err, req, reply) => {
    const userId = (req as any).userId as string | undefined;

    if (hasZodFastifySchemaValidationErrors(err)) {
      req.log.warn({ url: req.url, validation: err.validation }, 'Validation error');
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Validation failed',
        details: err.validation,
      });
    }

    req.log.error(
      {
        method: req.method,
        url: req.url,
        userId,
        err,
      },
      'request error'
    );
    const error = err as any;
    const statusCode = error.statusCode || 500;

    if (statusCode >= 500 && process.env.SENTRY_DSN && !isSelfHost()) {
      Sentry.captureException(err, {
        user: { id: userId },
        extra: {
          method: req.method,
          url: req.url,
        },
      });
    }

    return reply.status(statusCode).send({
      error:
        statusCode === 400
          ? 'Bad Request'
          : statusCode === 401 || statusCode === 403
            ? 'Unauthorized'
            : 'Internal Server Error',
      message:
        process.env.NODE_ENV === 'production' && statusCode >= 500
          ? 'An internal server error occurred'
          : error.message,
    });
  });

  // Validate required environment variables.
  // Only COOKIE_SECRET is mandatory. Google OAuth is optional — email + password
  // login works out of the box, which keeps self-hosting dependency-free.
  const requiredEnvVars = ['COOKIE_SECRET'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }
  // Refuse to boot with a weak or placeholder cookie secret — otherwise session
  // cookies are signed with a guessable key and can be forged.
  const cookieSecret = process.env.COOKIE_SECRET ?? '';
  if (cookieSecret.length < 32 || cookieSecret.includes('CHANGE_ME')) {
    console.error(
      'COOKIE_SECRET is too short or still the placeholder. ' +
        'Set a strong random value before starting, e.g.:  openssl rand -hex 32'
    );
    process.exit(1);
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('[auth] Google OAuth not configured; email + password login is available.');
  }
  // Email verification is cloud-only. Self-hosted leaves REQUIRE_EMAIL_VERIFICATION
  // unset, so no email credentials are needed. If it IS on, RESEND_API_KEY must be
  // set or codes can't be delivered — warn loudly rather than fail at send time.
  if (isEmailVerificationEnabled() && !process.env.RESEND_API_KEY) {
    console.warn(
      '[auth] REQUIRE_EMAIL_VERIFICATION is on but RESEND_API_KEY is not set; verification emails cannot be sent.'
    );
  }

  // 1. Register Core Plugins
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production' ? (process.env.FRONTEND_URL ?? false) : true,
    credentials: true,
  });
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET,
  });
  await app.register(formbody);
  // Capture the raw request body on routes that opt in via { config: { rawBody:
  // true } } — only the Dodo webhook needs it, for exact signature verification.
  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  const db = await createDb();
  await migrate(db);

  const userRepository = new UserRepository(db);
  const settingsRepository = new SettingsRepository(db);
  const subscriptionRepository = new SubscriptionRepository(db);
  const billingEventRepository = new BillingEventRepository(db);
  const entitlementService = new EntitlementService(userRepository, subscriptionRepository);
  // Payment provider. Null when billing is off, or on but not fully configured
  // (missing Dodo keys/product ids) — the billing routes report "unavailable".
  const paymentProvider = isBillingEnabled() ? createDodoProviderFromEnv() : null;
  if (isBillingEnabled() && !paymentProvider) {
    console.warn(
      '[billing] BILLING_ENABLED is on but Dodo is not fully configured; checkout/portal/webhook are disabled.'
    );
  }
  // Self-host is the free edition: billing and purchase emails are hard-disabled
  // even if the operator configured the cloud env. Warn so it's not a silent
  // surprise that those keys do nothing.
  if (isSelfHost() && (process.env.BILLING_ENABLED === 'true' || createDodoProviderFromEnv())) {
    console.warn(
      '[billing] SELF_HOST is set — billing, payments and purchase emails are disabled regardless of BILLING_ENABLED / DODO_* env.'
    );
  }
  const emailVerification = new EmailVerificationService(
    new EmailVerificationRepository(db),
    sendVerificationEmail,
    // COOKIE_SECRET is validated as present (>=32 chars) above; reuse it to key
    // the code hashes so a DB dump alone can't brute-force the 6-digit codes.
    process.env.COOKIE_SECRET as string
  );

  // 2. Register Auth Plugin
  await app.register(authPlugin, {
    userRepository,
  });

  // Health check endpoint (kept in index as it's a system route)
  app.get('/health', async (req, reply) => {
    try {
      // Test database connectivity
      await db.query('SELECT 1 as health_check');

      const includeDetails = process.env.NODE_ENV !== 'production';

      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ...(includeDetails
          ? {
              memory: process.memoryUsage(),
              version: process.version,
            }
          : {}),
      });
    } catch (error) {
      req.log.error({ error }, 'health check failed');
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // API responses are per-user and cookie-scoped — never let the browser (or
  // any intermediary) cache them. The HTTP cache does not vary on cookies, so a
  // cached identity could otherwise outlive a logout and leak into the next
  // account. Applies in dev and prod (the static-file no-cache hook below only
  // runs when this process also serves the frontend).
  app.addHook('onSend', async (req, reply, payload) => {
    if (req.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
    return payload;
  });

  // CSRF validation hook (C2)
  app.addHook('preHandler', async (req, reply) => {
    // Only check state-changing API endpoints
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.url.startsWith('/api/')) {
      // Admin/operational endpoints are called by a scheduler, not the browser,
      // and authenticate with their own shared secret — exempt from the CSRF
      // custom-header requirement.
      const isAdmin = req.url.startsWith('/api/admin/');
      // The Dodo webhook is a server-to-server call authenticated by its own
      // signature, not a browser request — exempt from the CSRF header check.
      const isWebhook = req.url === '/api/billing/webhook';
      const isApiKey = req.headers['authorization']?.startsWith('Bearer ');
      if (
        !isAdmin &&
        !isWebhook &&
        !isApiKey &&
        req.headers['x-requested-with'] !== 'XMLHttpRequest'
      ) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'CSRF validation failed: Missing custom header',
        });
      }
    }
  });

  // Rate limiting (M1 & M2)
  const defaultRateLimiter = createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: process.env.NODE_ENV === 'production' ? 300 : 5000,
  });

  const authRateLimiter = createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000,
    maxRequests: process.env.NODE_ENV === 'production' ? 10 : 1000,
  });

  app.addHook('preHandler', async (req, reply) => {
    // The Dodo webhook is server-to-server and retries from a single IP; rate
    // limiting it by IP would drop legitimate retries.
    if (req.url === '/api/billing/webhook') {
      return;
    }
    if (
      req.url.startsWith('/api/auth/login') ||
      req.url.startsWith('/api/auth/register') ||
      req.url.startsWith('/api/auth/verify-email') ||
      req.url.startsWith('/api/auth/resend-code')
    ) {
      return authRateLimiter(req, reply);
    }
    return defaultRateLimiter(req, reply);
  });

  // Entitlement gate (cloud billing). Only active when BILLING_ENABLED is set —
  // self-host never sets it, so the hook isn't registered and the app is fully
  // open. Gates only the core product surface (logging + the fertility
  // insights/charts). Auth, billing, account, data export and settings stay
  // reachable so a blocked user can still see the paywall, manage billing, and
  // export or delete their data. Applies to both cookie and API-key sessions.
  if (isBillingEnabled()) {
    const GATED_PREFIXES = ['/api/v1/logs', '/api/v1/insights'];
    app.addHook('preHandler', async (req, reply) => {
      const path = req.url.split('?')[0] ?? req.url;
      if (!GATED_PREFIXES.some((p) => path.startsWith(p))) return;
      // Unauthenticated requests are already rejected by the auth plugin.
      if (!req.userId) return;

      const ent = await entitlementService.forUser(req.userId);
      if (!ent || !ent.entitled) {
        return reply.status(402).send({
          error: 'payment_required',
          message: 'Your access has ended. Subscribe to keep using the app.',
          state: ent?.state ?? 'none',
        });
      }
    });
  }

  // Demo write-guard (authoritative). The shared public demo account is
  // explore-only: it may log/edit TODAY (reset on each login) but nothing else.
  // Every other /api/v1 mutation — deleting data/account, minting API keys,
  // changing cycle config or theme, re-anchoring — is blocked so one visitor
  // can't alter the shared account for the next. The client also locks these,
  // but this is the source of truth. Skipped entirely when the demo is off.
  if (isDemoAccountEnabled()) {
    // The demo user's id is stable across reseeds; resolve once and cache.
    let demoUserId: string | null = null;
    const resolveDemoUserId = async () => {
      if (demoUserId) return demoUserId;
      const u = await userRepository.findByEmail(DEMO_EMAIL);
      if (u) demoUserId = u.id;
      return demoUserId;
    };

    app.addHook('preHandler', async (req, reply) => {
      if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return;
      if (!req.userId) return;
      const path = req.url.split('?')[0] ?? req.url;
      if (!path.startsWith('/api/v1/')) return;

      if (req.userId !== (await resolveDemoUserId())) return;

      // Only allowance: writing today's log via PUT /api/v1/logs/:date.
      if (req.method === 'PUT' && path.startsWith('/api/v1/logs/')) {
        const date = path.slice('/api/v1/logs/'.length);
        if (date === isoToday()) return;
      }

      return reply.status(403).send({
        error: 'demo_readonly',
        message: 'The demo account is read-only. Create your own account to make changes.',
      });
    });
  }

  // Register Routes
  app.register(authRoutes, { userRepository, settingsRepository, emailVerification, db });

  // V5 Routes (Consolidated & Segregated)
  app.register(logsRoutes, { db });
  app.register(calendarRoutes, { db });
  app.register(userRoutes, { db });
  app.register(exportRoutes, { db });
  app.register(adminRoutes, { db });
  app.register(billingRoutes, {
    entitlementService,
    userRepository,
    subscriptionRepository,
    billingEventRepository,
    provider: paymentProvider,
    sendPurchaseEmail: sendPurchaseConfirmationEmail,
  });

  // Serve the built frontend SPA (single-image deployment). FRONTEND_DIST points
  // at the directory of built static files. When unset (e.g. API-only local dev
  // where Vite serves the frontend), this is skipped entirely.
  const frontendDir = process.env.FRONTEND_DIST ? resolve(process.env.FRONTEND_DIST) : null;
  if (frontendDir && existsSync(frontendDir)) {
    await app.register(fastifyStatic, {
      root: frontendDir,
      // By default @fastify/static serves with `max-age=0`, so the browser
      // revalidates static assets on every request — which makes images like
      // the logo (reused across many screens) blink on each remount. Cache
      // fingerprinted build assets forever, and stable-named assets (logo,
      // favicons, fonts) for a day. HTML, the service worker and the manifest
      // are intentionally left uncached (the latter two by the hook below) so
      // new deploys are always picked up.
      setHeaders: (res, filePath) => {
        if (filePath.includes('/_astro/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (/\.(png|jpe?g|svg|webp|ico|gif|woff2?)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    });

    // Service worker and manifest must never be cached by the browser so that
    // updates are always picked up on the next navigation.
    app.addHook('onSend', async (req, reply, payload) => {
      const url = req.url.split('?')[0];
      if (url === '/sw.js' || url === '/manifest.webmanifest') {
        reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');
      }
      return payload;
    });

    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' && !req.url.startsWith('/api/') && !req.url.startsWith('/health')) {
        return reply.sendFile('index.html'); // SPA fallback (client-side hash routing)
      }
      return reply.status(404).send({ error: 'Not Found' });
    });
    app.log.info({ frontendDir }, 'Serving frontend from disk (single-image mode)');
  }

  // Graceful shutdown handling
  async function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}, shutting down gracefully...`);

    try {
      // Close database connections
      await db.close();

      await app.close();
      console.log('Server shut down successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return { app };
}
