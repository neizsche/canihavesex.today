import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import { randomUUID } from 'node:crypto';

import { createDb } from './db.js';
import { migrate } from './migrate.js';
import { createRateLimitMiddleware } from './rateLimiter.js';
import { loadEnv } from './env.js';
import { UserRepository } from './repositories/UserRepository.js';
import { CycleRepository } from './repositories/CycleRepository.js';
import { LogRepository } from './repositories/LogRepository.js';
import { EngineRepository } from './repositories/EngineRepository.js';
import { PreferencesRepository } from './repositories/PreferencesRepository.js';

import { authRoutes } from './routes/auth.js';
import { apiRoutes } from './routes/api.js';

loadEnv();

const shouldPrettyLog =
  process.env.PRETTY_LOGS === '1' ||
  (process.env.PRETTY_LOGS !== '0' && process.env.NODE_ENV !== 'production' && !!process.stdout.isTTY);

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
});

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
  req.log.error(
    {
      method: req.method,
      url: req.url,
      userId,
      err,
    },
    'request error'
  );
  return reply.send(err);
});


// Validate required environment variables
const requiredEnvVars = ['COOKIE_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

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
const cycleRepository = new CycleRepository(db);
const logRepository = new LogRepository(db);
const engineRepository = new EngineRepository(db);
const preferencesRepository = new PreferencesRepository(db);

// Health check endpoint (kept in index as it's a system route)
app.get('/health', async (req, reply) => {
  try {
    // Test database connectivity
    await db.query('SELECT 1 as health_check');

    return reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
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


// Auth preHandler: require a signed uid cookie for protected API routes.
app.addHook('preHandler', async (req, reply) => {
  if (
    req.url.startsWith('/api/') &&
    !req.url.startsWith('/api/auth/oauth/') &&
    req.url !== '/api/signout' &&
    req.url !== '/api/session/check' &&
    !req.url.startsWith('/api/waitlist')
  ) {
    const unsigned = req.cookies.uid ? req.unsignCookie(req.cookies.uid) : null;
    const uid = unsigned && unsigned.valid ? (unsigned.value ?? null) : null;
    if (!uid) return reply.status(401).send({ error: 'Not authenticated' });
    (req as any).userId = uid;
  }
});

// Rate limiting
app.addHook(
  'preHandler',
  createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  })
);

// Register Routes
app.register(authRoutes, { userRepository, cycleRepository, preferencesRepository });
app.register(apiRoutes, { logRepository, engineRepository, cycleRepository, db, userRepository, preferencesRepository });

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    // Close database connections
    if (db.kind === 'postgres') {
      // For PostgreSQL, we need to access the pool through a different approach
      // Since we're using the abstraction, we'll handle this in the db.ts file
    }

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

const port = process.env.PORT ? parseInt(process.env.PORT) : 1299;
const host = '0.0.0.0';

try {
  await app.listen({ port, host });
  console.log(`Backend listening on ${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
