import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { createRateLimitMiddleware } from './rateLimiter.js';
import { loadEnv } from './env.js';
import { UserRepository } from './repositories/UserRepository.js';
import { SettingsRepository } from './repositories/SettingsRepository.js';
import { ApiKeyRepository } from './repositories/ApiKeyRepository.js';
import { extractApiKey, hashApiKey } from './apiKeys.js';
import authPlugin from './plugins/auth.js';

import { authRoutes } from './routes/auth.js';
import { logsRoutes } from './routes/logs.js';
import { calendarRoutes } from './routes/calendar.js';
import { exportRoutes } from './routes/export.js';
import { userRoutes } from './routes/user.js';

loadEnv();

const shouldPrettyLog =
  process.env.PRETTY_LOGS === '1' ||
  (process.env.PRETTY_LOGS !== '0' && process.env.NODE_ENV !== 'production' && !!process.stdout.isTTY);

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

    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      const xfProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
      const proto = xfProto || (req as any).protocol;
      if (proto && proto !== 'https') {
        return reply.redirect(`https://${req.headers.host}${req.url}`);
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
    const durationMs = startAt ? Number((process.hrtime.bigint() - startAt) / 1_000_000n) : undefined;
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
        details: err.validation
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
    
    return reply.status(statusCode).send({
      error: statusCode === 400 ? 'Bad Request' : (statusCode === 401 || statusCode === 403 ? 'Unauthorized' : 'Internal Server Error'),
      message: process.env.NODE_ENV === 'production' && statusCode >= 500
        ? 'An internal server error occurred'
        : error.message
    });
  });


  // Validate required environment variables.
  // Only COOKIE_SECRET is mandatory. Google OAuth is optional — email + password
  // login works out of the box, which keeps self-hosting dependency-free.
  const requiredEnvVars = ['COOKIE_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
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

  // 1. Register Core Plugins
  await app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL ?? false
      : true,
    credentials: true,
  });
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET,
  });
  await app.register(formbody);

  const db = await createDb();
  await migrate(db);

  const userRepository = new UserRepository(db);
  const settingsRepository = new SettingsRepository(db);
  const apiKeyRepository = new ApiKeyRepository(db);

  // 2. Register Auth Plugin
  await app.register(authPlugin, {
    userRepository,
    apiKeyRepository
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


  // CSRF validation hook (C2)
  app.addHook('preHandler', async (req, reply) => {
    // Only check state-changing API endpoints
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.url.startsWith('/api/')) {
      const isApiKey = req.headers['authorization']?.startsWith('Bearer ');
      if (!isApiKey && req.headers['x-requested-with'] !== 'XMLHttpRequest') {
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
    if (req.url.startsWith('/api/auth/login') || req.url.startsWith('/api/auth/register')) {
      return authRateLimiter(req, reply);
    }
    return defaultRateLimiter(req, reply);
  });


  // Register Routes
  app.register(authRoutes, { userRepository, settingsRepository });

  // V5 Routes (Consolidated & Segregated)
  app.register(logsRoutes, { db });
  app.register(calendarRoutes, { db });
  app.register(userRoutes, { db });
  app.register(exportRoutes, { db });

  // Serve the built frontend SPA (single-image deployment). FRONTEND_DIST points
  // at the directory of built static files. When unset (e.g. API-only local dev
  // where Vite serves the frontend), this is skipped entirely.
  const frontendDir = process.env.FRONTEND_DIST ? resolve(process.env.FRONTEND_DIST) : null;
  if (frontendDir && existsSync(frontendDir)) {
    await app.register(fastifyStatic, { root: frontendDir });

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
