import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import { randomUUID } from 'node:crypto';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { createRateLimitMiddleware } from './rateLimiter.js';
import { loadEnv } from './env.js';
import { UserRepository } from './repositories/UserRepository.js';
import { PreferencesRepository } from './repositories/PreferencesRepository.js';
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
    return reply.status(error.statusCode || 500).send({
      error: error.statusCode === 400 ? 'Bad Request' : (error.statusCode === 401 || error.statusCode === 403 ? 'Unauthorized' : 'Internal Server Error'),
      message: error.message
    });
  });


  // Validate required environment variables
  const requiredEnvVars = ['COOKIE_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
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
  const preferencesRepository = new PreferencesRepository(db);
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

      const includeDetails =
        process.env.HEALTH_DETAILS === '1' ||
        process.env.NODE_ENV !== 'production';

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


  // Rate limiting
  app.addHook(
    'preHandler',
    createRateLimitMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5000, // Increased for dev/testing safety
    })
  );


  // Register Routes
  app.register(authRoutes, { userRepository, preferencesRepository });

  // V5 Routes (Consolidated & Segregated)
  app.register(logsRoutes, { db });
  app.register(calendarRoutes, { db });
  app.register(userRoutes, { db });
  app.register(exportRoutes, { db });




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
