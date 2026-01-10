import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import { z } from 'zod';
import { createPublicKey, randomUUID, verify as cryptoVerify } from 'node:crypto';

import { createDb } from './db.js';
import type { Db } from './db.js';
import { migrate } from './migrate.js';
import type { Cycle, DailyLog } from './types.js';
import { calculateRisk, fertilityIndexForLog, updateCycleState } from './fertilityEngine.js';
import { createRateLimitMiddleware } from './rateLimiter.js';
import { loadEnv } from './env.js';

loadEnv();

const shouldPrettyLog =
  process.env.PRETTY_LOGS === '1' ||
  (process.env.PRETTY_LOGS !== '0' && process.env.NODE_ENV !== 'production' && !!process.stdout.isTTY);

const app = Fastify({
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
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return reply.redirect(`https://${req.headers.host}${req.url}`);
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

const adminToken = process.env.ADMIN_TOKEN ?? null;

// Health check endpoint
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

app.get('/admin', async (req, reply) => {
  if (!adminToken) return reply.status(404).send('Not found');
  const token = (req.headers['x-admin-token'] as string | undefined) ?? '';
  if (token !== adminToken) return reply.status(401).send('Unauthorized');

  reply.header('content-type', 'text/html; charset=utf-8');
  return reply.send(`<!doctype html>
  <html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Admin</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;margin:20px}code{background:#f3f3f3;padding:2px 6px;border-radius:6px}</style>
  </head><body>
    <h1>Admin</h1>
    <p>Send <code>x-admin-token</code> header with your token.</p>
    <ul>
      <li><code>GET /admin/users</code></li>
      <li><code>GET /admin/cycles</code></li>
      <li><code>GET /admin/logs?limit=50</code></li>
    </ul>
  </body></html>`);
});

app.get('/admin/users', async (req, reply) => {
  if (!adminToken) return reply.status(404).send({ error: 'Not found' });
  const token = (req.headers['x-admin-token'] as string | undefined) ?? '';
  if (token !== adminToken) return reply.status(401).send({ error: 'Unauthorized' });

  const rows = await db.query<any>(
    db.paramStyle === 'postgres'
      ? 'select id, email, created_at as "createdAt" from users order by created_at desc limit 100'
      : 'select id, email, created_at as createdAt from users order by created_at desc limit 100'
  );
  return reply.send({ users: rows });
});

app.get('/admin/cycles', async (req, reply) => {
  if (!adminToken) return reply.status(404).send({ error: 'Not found' });
  const token = (req.headers['x-admin-token'] as string | undefined) ?? '';
  if (token !== adminToken) return reply.status(401).send({ error: 'Unauthorized' });

  const rows = await db.query<any>(
    db.paramStyle === 'postgres'
      ? 'select id, user_id as "userId", start_date as "startDate", state, peak_date as "peakDate", temp_shift_confirmed_date as "tempShiftConfirmedDate", created_at as "createdAt" from cycles order by created_at desc limit 200'
      : 'select id, user_id as userId, start_date as startDate, state, peak_date as peakDate, temp_shift_confirmed_date as tempShiftConfirmedDate, created_at as createdAt from cycles order by created_at desc limit 200'
  );
  return reply.send({ cycles: rows });
});

app.get('/admin/logs', async (req, reply) => {
  if (!adminToken) return reply.status(404).send({ error: 'Not found' });
  const token = (req.headers['x-admin-token'] as string | undefined) ?? '';
  if (token !== adminToken) return reply.status(401).send({ error: 'Unauthorized' });

  const limitRaw = (req.query as any)?.limit;
  const limit = Math.max(1, Math.min(500, Number(limitRaw ?? 50)));

  const rows = await db.query<any>(
    db.paramStyle === 'postgres'
      ? 'select id, user_id as "userId", cycle_id as "cycleId", date, mucus_type as "mucusType", sensation, bleeding, temperature, lh_test as "lhTest", created_at as "createdAt" from daily_logs order by date desc limit $1'
      : 'select id, user_id as userId, cycle_id as cycleId, date, mucus_type as mucusType, sensation, bleeding, temperature, lh_test as lhTest, created_at as createdAt from daily_logs order by date desc limit ?',
    [limit]
  );
  return reply.send({ logs: rows });
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

// Rate limiting for API endpoints
app.addHook('preHandler', createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
}));

const db = await createDb();
await migrate(db);

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

type OauthProvider = 'google' | 'apple';

type JwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type GoogleJwk = {
  kty: string;
  kid: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  x5c?: string[];
};

type GoogleIdTokenPayload = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  nbf?: number;
  azp?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

function decodeJwtPartJson(part: string): any {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

function normalizeAud(aud: unknown): string[] {
  if (typeof aud === 'string') return [aud];
  if (Array.isArray(aud)) return aud.filter(x => typeof x === 'string') as string[];
  return [];
}

let googleJwksCache: { expiresAtMs: number; keys: GoogleJwk[] } | null = null;

async function fetchGoogleJwks(): Promise<GoogleJwk[]> {
  const now = Date.now();
  if (googleJwksCache && googleJwksCache.expiresAtMs > now) return googleJwksCache.keys;

  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`jwks_fetch_failed:${res.status}`);

  const cacheControl = res.headers.get('cache-control') ?? '';
  const m = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = m ? Number(m[1]) : 3600;
  const expiresAtMs = now + Math.max(60, maxAgeSeconds) * 1000;

  const json = (await res.json()) as any;
  const keys = (Array.isArray(json?.keys) ? json.keys : []) as GoogleJwk[];
  if (!keys.length) throw new Error('jwks_empty');

  googleJwksCache = { expiresAtMs, keys };
  return keys;
}

function verifyJwtRs256Signature(params: { jwt: string; header: JwtHeader; jwks: GoogleJwk[] }): void {
  const [encodedHeader, encodedPayload, encodedSig] = params.jwt.split('.');
  if (!encodedHeader || !encodedPayload || !encodedSig) throw new Error('jwt_format');

  const alg = String(params.header.alg ?? '');
  if (alg !== 'RS256') throw new Error('jwt_alg_not_rs256');

  const kid = String(params.header.kid ?? '');
  if (!kid) throw new Error('jwt_missing_kid');

  const jwk = params.jwks.find(k => k.kid === kid);
  if (!jwk) throw new Error('jwks_no_matching_kid');

  // Node supports JWK import directly (avoids PEM conversion).
  const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' as any });
  const signedData = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf8');
  const signature = Buffer.from(encodedSig, 'base64url');
  const ok = cryptoVerify('RSA-SHA256', signedData, publicKey, signature);
  if (!ok) throw new Error('jwt_bad_signature');
}

function validateGoogleIdTokenClaims(payload: GoogleIdTokenPayload, clientId: string): void {
  const iss = String(payload.iss ?? '');
  if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
    throw new Error('iss_mismatch');
  }

  const auds = normalizeAud(payload.aud);
  if (!auds.includes(clientId)) throw new Error('aud_mismatch');

  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
  if (!exp || exp < now) throw new Error('token_expired');

  const iat = typeof payload.iat === 'number' ? payload.iat : undefined;
  if (iat && iat > now + 300) throw new Error('token_future');

  const nbf = typeof payload.nbf === 'number' ? payload.nbf : undefined;
  if (nbf && nbf > now + 60) throw new Error('token_not_yet_valid');
}

async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdTokenPayload> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('invalid_token_format');

  const header = decodeJwtPartJson(parts[0]) as JwtHeader;
  const payload = decodeJwtPartJson(parts[1]) as GoogleIdTokenPayload;

  // Always validate the claims ourselves (even if signature verification uses tokeninfo fallback).
  validateGoogleIdTokenClaims(payload, clientId);

  try {
    const jwks = await fetchGoogleJwks();
    verifyJwtRs256Signature({ jwt: idToken, header, jwks });
    return payload;
  } catch (e) {
    // Fallback: Google tokeninfo endpoint (still validate claims locally).
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
      { headers: { accept: 'application/json' } }
    );
    if (!res.ok) throw e;
    const tokeninfo = (await res.json()) as any;

    // tokeninfo fields are strings
    const tokeninfoPayload: GoogleIdTokenPayload = {
      iss: tokeninfo?.iss,
      aud: tokeninfo?.aud,
      exp: tokeninfo?.exp ? Number(tokeninfo.exp) : undefined,
      iat: tokeninfo?.iat ? Number(tokeninfo.iat) : undefined,
      sub: tokeninfo?.sub,
      email: tokeninfo?.email,
      email_verified:
        tokeninfo?.email_verified === true ||
        tokeninfo?.email_verified === 'true' ||
        tokeninfo?.email_verified === '1',
      azp: tokeninfo?.azp,
    };
    validateGoogleIdTokenClaims(tokeninfoPayload, clientId);
    return tokeninfoPayload;
  }
}

function publicBackendBase(req: any): string {
  const configured = process.env.PUBLIC_BACKEND_BASE;
  if (configured) return configured.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? (req.headers.host as string | undefined) ?? 'localhost:1299';
  return `${proto}://${host}`.replace(/\/$/, '');
}

function appBase(): string {
  return (process.env.PUBLIC_APP_BASE ?? 'http://localhost:3112').replace(/\/$/, '');
}

function oauthRedirectUri(provider: OauthProvider, req: any): string {
  return `${publicBackendBase(req)}/api/auth/oauth/${provider}/callback`;
}

async function ensureUserForEmail(email: string): Promise<string> {
  const now = new Date().toISOString();
  const existing = await db.query<{ id: string }>(
    db.paramStyle === 'postgres' ? 'select id from users where email = $1' : 'select id from users where email = ?',
    [email]
  );
  const userId = existing[0]?.id ?? randomUUID();

  if (!existing[0]) {
    await db.query(
      db.paramStyle === 'postgres'
        ? 'insert into users (id, email, created_at) values ($1, $2, $3)'
        : 'insert into users (id, email, created_at) values (?, ?, ?)',
      [userId, email, now]
    );

    const cycleId = randomUUID();
    const startDate = now.slice(0, 10);
    await db.query(
      db.paramStyle === 'postgres'
        ? 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values ($1,$2,$3,$4,$5,$6,$7)'
        : 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values (?,?,?,?,?,?,?)',
      [cycleId, userId, startDate, 'INFERTILE_PRE', null, null, now]
    );
  }

  return userId;
}

async function linkIdentity(params: {
  provider: OauthProvider;
  providerUserId: string;
  email: string;
}): Promise<string> {
  const now = new Date().toISOString();

  const existing = await db.query<{ user_id: string }>(
    db.paramStyle === 'postgres'
      ? 'select user_id as "user_id" from user_identities where provider = $1 and provider_user_id = $2'
      : 'select user_id as user_id from user_identities where provider = ? and provider_user_id = ?',
    [params.provider, params.providerUserId]
  );

  if (existing[0]?.user_id) return existing[0].user_id;

  const userId = await ensureUserForEmail(params.email);
  const identityId = randomUUID();
  await db.query(
    db.paramStyle === 'postgres'
      ? 'insert into user_identities (id, user_id, provider, provider_user_id, email, created_at) values ($1,$2,$3,$4,$5,$6)'
      : 'insert into user_identities (id, user_id, provider, provider_user_id, email, created_at) values (?,?,?,?,?,?)',
    [identityId, userId, params.provider, params.providerUserId, params.email, now]
  );
  return userId;
}

function safeReturnTo(v: unknown): string {
  const s = typeof v === 'string' ? v : '';
  if (!s) return '/';
  if (!s.startsWith('/')) return '/';
  if (s.startsWith('//')) return '/';
  return s;
}

app.get('/api/auth/oauth/:provider/start', async (req, reply) => {
  const provider = (req.params as any).provider as OauthProvider;
  const returnTo = safeReturnTo((req.query as any)?.returnTo);

  if (provider !== 'google') {
    return reply.status(400).send({ error: 'Unsupported provider' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  if (!clientId) return reply.status(500).send({ error: 'GOOGLE_CLIENT_ID not configured' });

  const state = randomUUID();
  reply.setCookie('oauth_state', state, { path: '/', httpOnly: true, sameSite: 'lax' });
  reply.setCookie('oauth_return_to', returnTo, { path: '/', httpOnly: true, sameSite: 'lax' });

  const redirectUri = oauthRedirectUri('google', req);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);

  return reply.redirect(url.toString());
});

app.get('/api/auth/oauth/:provider/callback', async (req, reply) => {
  const provider = (req.params as any).provider as OauthProvider;
  if (provider !== 'google') return reply.status(400).send({ error: 'Unsupported provider' });

  const query = req.query as any;
  const code = String(query?.code ?? '');
  const state = String(query?.state ?? '');
  const err = query?.error ? String(query.error) : '';

  if (err) return reply.redirect(`${appBase()}/auth?error=${encodeURIComponent(err)}`);
  if (!code || !state) return reply.redirect(`${appBase()}/auth?error=missing_code`);

  const stateCookie = (req.cookies.oauth_state as string | undefined) ?? '';
  const returnToCookie = (req.cookies.oauth_return_to as string | undefined) ?? '/';
  const returnTo = safeReturnTo(returnToCookie);

  if (!stateCookie || stateCookie !== state) {
    return reply.redirect(`${appBase()}/auth?error=state_mismatch`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';
  if (!clientId || !clientSecret) return reply.status(500).send({ error: 'Google OAuth not configured' });

  const redirectUri = oauthRedirectUri('google', req);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    app.log.warn({ route: 'oauth/google/callback', status: tokenRes.status }, 'token exchange failed');
    return reply.redirect(`${appBase()}/auth?error=token_exchange_failed`);
  }

  const tokenJson = (await tokenRes.json()) as any;
  const idToken = String(tokenJson?.id_token ?? '');
  if (!idToken) return reply.redirect(`${appBase()}/auth?error=missing_id_token`);

  try {
    const payload = await verifyGoogleIdToken(idToken, clientId);

    const email = String(payload?.email ?? '').toLowerCase();
    const emailVerified = Boolean(payload?.email_verified);
    const sub = String(payload?.sub ?? '');

    if (!email || !sub) return reply.redirect(`${appBase()}/auth?error=missing_profile`);
    if (!emailVerified) return reply.redirect(`${appBase()}/auth?error=email_not_verified`);

    const userId = await linkIdentity({ provider: 'google', providerUserId: sub, email });
    reply.clearCookie('oauth_state', { path: '/' });
    reply.clearCookie('oauth_return_to', { path: '/' });
    reply.setCookie('uid', userId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      signed: true,
      secure: process.env.NODE_ENV === 'production',
      // fastify/cookie uses seconds (Set-Cookie Max-Age)
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    return reply.redirect(`${appBase()}${returnTo}`);
  } catch (e) {
    req.log.warn({ route: 'oauth/google/callback', err: e }, 'id_token verification failed');
    return reply.redirect(`${appBase()}/auth?error=invalid_token`);
  }
});

app.post('/api/logout', async (_req, reply) => {
  reply.clearCookie('uid', { path: '/' });
  return reply.send({ ok: true });
});

app.addHook('preHandler', async (req, reply) => {
  if (
    req.url.startsWith('/api/') &&
    !req.url.startsWith('/api/auth/oauth/') &&
    req.url !== '/api/logout'
  ) {
    const unsigned = req.cookies.uid ? req.unsignCookie(req.cookies.uid) : null;
    const uid = unsigned && unsigned.valid ? (unsigned.value ?? null) : null;
    if (!uid) return reply.status(401).send({ error: 'Not authenticated' });
    (req as any).userId = uid;
  }
});

const LogDayBody = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mucusType: z.enum(['dry', 'sticky', 'creamy', 'watery', 'eggwhite']),
  sensation: z.enum(['dry', 'damp', 'slippery']),
  bleeding: z.enum(['none', 'spotting', 'light', 'heavy']),
  temperature: z.number().nullable().optional(),
  lhTest: z.enum(['positive', 'negative', 'notTaken']),
});

app.post('/api/log-day', async (req, reply) => {
  try {
    const userId = (req as any).userId as string;
    const parsed = LogDayBody.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn({ route: '/api/log-day', userId, validationError: parsed.error }, 'invalid payload');
      return reply.status(400).send({ error: 'Invalid payload', details: parsed.error.issues });
    }

    const now = new Date().toISOString();
    const { date, mucusType, sensation, bleeding, temperature, lhTest } = parsed.data;

    app.log.info(
      { route: '/api/log-day', userId, date, mucusType, sensation, bleeding, temperature, lhTest },
      'log-day'
    );

    try {
      // Create new cycle if bleeding indicates period start
      if (bleeding === 'light' || bleeding === 'heavy') {
        const cycleId = randomUUID();
        await db.query(
          db.paramStyle === 'postgres'
            ? 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values ($1,$2,$3,$4,$5,$6,$7)'
            : 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values (?,?,?,?,?,?,?)',
          [cycleId, userId, date, 'INFERTILE_PRE', null, null, now]
        );
        req.log.info({ route: '/api/log-day', userId, cycleId }, 'new cycle created');
      }

      // Get current cycle
      const cycle = await getCurrentCycle(db, userId);

      // Insert/update daily log
      const logId = randomUUID();
      await db.query(
        db.paramStyle === 'postgres'
          ? `insert into daily_logs
              (id, user_id, cycle_id, date, mucus_type, sensation, bleeding, temperature, lh_test, sick, bad_sleep, alcohol, created_at)
             values
              ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,0,0,$10)
             on conflict (user_id, date) do update set
              cycle_id = excluded.cycle_id,
              mucus_type = excluded.mucus_type,
              sensation = excluded.sensation,
              bleeding = excluded.bleeding,
              temperature = excluded.temperature,
              lh_test = excluded.lh_test`
          : `insert into daily_logs
              (id, user_id, cycle_id, date, mucus_type, sensation, bleeding, temperature, lh_test, sick, bad_sleep, alcohol, created_at)
             values
              (?,?,?,?,?,?,?,?,?,0,0,0,?)
             on conflict(user_id, date) do update set
              cycle_id=excluded.cycle_id,
              mucus_type=excluded.mucus_type,
              sensation=excluded.sensation,
              bleeding=excluded.bleeding,
              temperature=excluded.temperature,
              lh_test=excluded.lh_test`,
        [logId, userId, cycle.id, date, mucusType, sensation, bleeding, temperature ?? null, lhTest, now]
      );

      // Update cycle state based on new data
      const logsInCycle = await getLogsInCycle(db, userId, cycle.id);
      const updated = updateCycleState({ cycle, logsInCycle });

      app.log.info(
        { route: '/api/log-day', userId, cycleId: cycle.id, state: updated.state, peakDate: updated.peakDate, tempShift: updated.tempShiftConfirmedDate },
        'cycle updated'
      );

      await db.query(
        db.paramStyle === 'postgres'
          ? 'update cycles set state=$1, peak_date=$2, temp_shift_confirmed_date=$3 where id=$4'
          : 'update cycles set state=?, peak_date=?, temp_shift_confirmed_date=? where id=?',
        [updated.state, updated.peakDate, updated.tempShiftConfirmedDate, cycle.id]
      );

      return reply.send({ ok: true, cycleState: updated.state });

    } catch (dbError) {
      req.log.error({ route: '/api/log-day', userId, dbError, date }, 'database operation failed');
      return reply.status(500).send({ error: 'Database operation failed' });
    }

  } catch (error) {
    const userId = (req as any).userId as string | undefined;
    req.log.error({ route: '/api/log-day', userId, error }, 'unexpected error in log-day');
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

app.get('/api/today', async (req, reply) => {
  try {
    const userId = (req as any).userId as string;
    const today = new Date().toISOString().slice(0, 10);

    try {
      const cycle = await getCurrentCycle(db, userId);
      const logsInCycle = await getLogsInCycle(db, userId, cycle.id);

      const updated = updateCycleState({ cycle, logsInCycle });

      const todayLog = logsInCycle.find((l) => l.date === today) ?? null;
      const fertilityIndexToday = todayLog ? fertilityIndexForLog(todayLog) : 0;

      const yesterday = isoDateOffset(-1);
      const yesterdayLog = logsInCycle.find((l) => l.date === yesterday) ?? null;
      const lhPositiveCarryover = yesterdayLog?.lhTest === 'positive';

      const risk = calculateRisk({
        cycleState: updated.state,
        todayLog,
        fertilityIndexToday,
        tempShiftConfirmed: updated.tempShiftConfirmedDate !== null,
        lhPositiveCarryover,
      });

      app.log.info(
        {
          route: '/api/today',
          userId,
          date: today,
          cycleState: updated.state,
          fertilityIndexToday,
          risk: risk.risk,
          peakDate: updated.peakDate,
          tempShift: updated.tempShiftConfirmedDate,
        },
        'today risk calculated'
      );

      return {
        date: today,
        risk: risk.risk,
        explanation: risk.explanation,
        disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
      };

    } catch (dbError) {
      req.log.error({ route: '/api/today', userId, dbError }, 'database operation failed');
      return reply.status(500).send({ error: 'Database operation failed' });
    }

  } catch (error) {
    const userId = (req as any).userId as string | undefined;
    req.log.error({ route: '/api/today', userId, error }, 'unexpected error in today');
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

app.get('/api/chart', async (req, reply) => {
  try {
    const userId = (req as any).userId as string;

    try {
      const cycle = await getCurrentCycle(db, userId);
      const logsInCycle = await getLogsInCycle(db, userId, cycle.id);
      const updated = updateCycleState({ cycle, logsInCycle });

      app.log.info(
        { route: '/api/chart', userId, cycleId: cycle.id, days: logsInCycle.length, state: updated.state },
        'chart data calculated'
      );

      const days = logsInCycle
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((l) => {
          try {
            const idx = fertilityIndexForLog(l);
            const yesterday = isoDateFrom(l.date, -1);
            const y = logsInCycle.find((x) => x.date === yesterday) ?? null;
            const lhPositiveCarryover = y?.lhTest === 'positive';
            const r = calculateRisk({
              cycleState: updated.state,
              todayLog: l,
              fertilityIndexToday: idx,
              tempShiftConfirmed: updated.tempShiftConfirmedDate !== null,
              lhPositiveCarryover,
            });
            return {
              date: l.date,
              fertilityIndex: idx,
              risk: r.risk,
              temperature: l.temperature,
              lhTest: l.lhTest,
            };
          } catch (calcError) {
            req.log.warn({ route: '/api/chart', userId, date: l.date, calcError }, 'error calculating risk for date');
            return {
              date: l.date,
              fertilityIndex: 0,
              risk: 'HIGH' as const, // Conservative default
              temperature: l.temperature,
              lhTest: l.lhTest,
            };
          }
        });

      return {
        cycle: {
          id: cycle.id,
          startDate: cycle.startDate,
          state: updated.state,
          peakDate: updated.peakDate,
          tempShiftConfirmedDate: updated.tempShiftConfirmedDate,
        },
        days,
        disclaimer: 'This is not medical advice. This does not guarantee pregnancy prevention.',
      };

    } catch (dbError) {
      req.log.error({ route: '/api/chart', userId, dbError }, 'database operation failed');
      return reply.status(500).send({ error: 'Database operation failed' });
    }

  } catch (error) {
    const userId = (req as any).userId as string | undefined;
    req.log.error({ route: '/api/chart', userId, error }, 'unexpected error in chart');
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

app.post('/api/reset-cycle', async (req, reply) => {
  try {
    const userId = (req as any).userId as string;
    const now = new Date().toISOString();
    const startDate = now.slice(0, 10);
    const cycleId = randomUUID();

    try {
      await db.query(
        db.paramStyle === 'postgres'
          ? 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values ($1,$2,$3,$4,$5,$6,$7)'
          : 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values (?,?,?,?,?,?,?)',
        [cycleId, userId, startDate, 'INFERTILE_PRE', null, null, now]
      );

      req.log.info({ route: '/api/reset-cycle', userId, cycleId }, 'cycle reset');
      return reply.send({ ok: true });

    } catch (dbError) {
      req.log.error({ route: '/api/reset-cycle', userId, dbError }, 'database operation failed');
      return reply.status(500).send({ error: 'Failed to reset cycle' });
    }

  } catch (error) {
    const userId = (req as any).userId as string | undefined;
    req.log.error({ route: '/api/reset-cycle', userId, error }, 'unexpected error in reset-cycle');
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

app.post('/api/delete-all-data', async (req, reply) => {
  try {
    const userId = (req as any).userId as string;

    app.log.warn({ route: '/api/delete-all-data', userId }, 'delete all data initiated');

    try {
      // Delete in correct order to maintain referential integrity
      await db.query(
        db.paramStyle === 'postgres' ? 'delete from daily_logs where user_id=$1' : 'delete from daily_logs where user_id=?',
        [userId]
      );
      await db.query(
        db.paramStyle === 'postgres' ? 'delete from cycles where user_id=$1' : 'delete from cycles where user_id=?',
        [userId]
      );

      req.log.warn({ route: '/api/delete-all-data', userId }, 'all user data deleted');
      return reply.send({ ok: true });

    } catch (dbError) {
      req.log.error({ route: '/api/delete-all-data', userId, dbError }, 'database operation failed');
      return reply.status(500).send({ error: 'Failed to delete data' });
    }

  } catch (error) {
    const userId = (req as any).userId as string | undefined;
    req.log.error({ route: '/api/delete-all-data', userId, error }, 'unexpected error in delete-all-data');
    return reply.status(500).send({ error: 'Internal server error' });
  }
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '0.0.0.0';
try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error({ err, host, port }, 'server failed to start');
  process.exit(1);
}

async function getCurrentCycle(db: Db, userId: string): Promise<Cycle> {
  try {
    const rows = await db.query<Cycle>(
      db.paramStyle === 'postgres'
        ? 'select id, user_id as "userId", start_date as "startDate", state, peak_date as "peakDate", temp_shift_confirmed_date as "tempShiftConfirmedDate", created_at as "createdAt" from cycles where user_id = $1 order by start_date desc, created_at desc limit 1'
        : 'select id, user_id as userId, start_date as startDate, state, peak_date as peakDate, temp_shift_confirmed_date as tempShiftConfirmedDate, created_at as createdAt from cycles where user_id = ? order by start_date desc, created_at desc limit 1',
      [userId]
    );
    if (!rows[0]) {
      // Create a default cycle for new users
      const now = new Date().toISOString();
      const startDate = now.slice(0, 10);
      const cycleId = randomUUID();

      await db.query(
        db.paramStyle === 'postgres'
          ? 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values ($1,$2,$3,$4,$5,$6,$7)'
          : 'insert into cycles (id, user_id, start_date, state, peak_date, temp_shift_confirmed_date, created_at) values (?,?,?,?,?,?,?)',
        [cycleId, userId, startDate, 'INFERTILE_PRE', null, null, now]
      );

      return {
        id: cycleId,
        userId,
        startDate,
        state: 'INFERTILE_PRE',
        peakDate: null,
        tempShiftConfirmedDate: null,
        createdAt: now,
      };
    }
    return rows[0] as Cycle;
  } catch (error) {
    throw new Error(`Failed to get current cycle for user ${userId}: ${error}`);
  }
}

async function getLogsInCycle(
  db: Db,
  userId: string,
  cycleId: string
): Promise<DailyLog[]> {
  try {
    const rows = await db.query<any>(
      db.paramStyle === 'postgres'
        ? `select
            id,
            user_id as "userId",
            cycle_id as "cycleId",
            date,
            mucus_type as "mucusType",
            sensation,
            bleeding,
            temperature,
            lh_test as "lhTest",
            sick,
            bad_sleep as "badSleep",
            alcohol,
            created_at as "createdAt"
           from daily_logs
           where user_id = $1 and cycle_id = $2
           order by date asc`
        : `select
            id,
            user_id as userId,
            cycle_id as cycleId,
            date,
            mucus_type as mucusType,
            sensation,
            bleeding,
            temperature,
            lh_test as lhTest,
            sick,
            bad_sleep as badSleep,
            alcohol,
            created_at as createdAt
           from daily_logs
           where user_id = ? and cycle_id = ?
           order by date asc`,
      [userId, cycleId]
    );

    return (rows as any[]).map((r) => ({
      ...r,
      sick: !!r.sick,
      badSleep: !!r.badSleep,
      alcohol: !!r.alcohol,
    })) as DailyLog[];
  } catch (error) {
    throw new Error(`Failed to get logs for cycle ${cycleId}, user ${userId}: ${error}`);
  }
}

function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isoDateFrom(iso: string, offsetDays: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
