import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { UserRepository } from '../repositories/UserRepository.js';
import type { SettingsRepository } from '../repositories/SettingsRepository.js';
import { hashPassword, verifyPassword } from '../password.js';
import { DEMO_EMAIL, isDemoAccountEnabled } from '../config.js';
import { LogRepository } from '../repositories/LogRepository.js';
import { EngineService } from '../services/EngineService.js';
import { cacheService } from '../services/CacheService.js';
import { isoToday } from '../utils/dates.js';
import { isEmailVerificationEnabled } from '../emailVerification.js';
import type { EmailVerificationService } from '../services/EmailVerificationService.js';
import {
  appBase,
  ensureUserForEmail,
  googleConfigured,
  isPasswordAuthEnabled,
  linkIdentity,
  oauthRedirectUri,
  OauthProvider,
  publicBackendBase,
  safeReturnTo,
  setSessionCookie,
  verifyGoogleIdToken,
  sessionCookieOptions,
} from '../auth.js';

export async function authRoutes(
  app: FastifyInstance,
  opts: {
    userRepository: UserRepository;
    settingsRepository: SettingsRepository;
    emailVerification: EmailVerificationService;
    db: any;
  }
) {
  const { userRepository, settingsRepository, emailVerification, db } = opts;
  const logRepository = new LogRepository(db);
  const engineService = new EngineService(db);

  const credsSchema = z.object({
    email: z
      .string()
      .email()
      .transform((s) => s.trim().toLowerCase()),
    password: z.string().min(8).max(200),
  });

  const emailSchema = z.object({
    email: z
      .string()
      .email()
      .transform((s) => s.trim().toLowerCase()),
  });

  const verifyCodeSchema = z.object({
    email: z
      .string()
      .email()
      .transform((s) => s.trim().toLowerCase()),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  });

  // Which auth providers are enabled (driven by env). The sign-in page reads this
  // to render only the buttons that are available for this deployment.
  app.get('/api/auth/providers', async (_req, reply) => {
    return reply.send({
      password: isPasswordAuthEnabled(),
      google: googleConfigured(),
      oidc: false,
      demo: isDemoAccountEnabled(),
    });
  });

  // One-tap demo: drops a session cookie for the shared, pre-seeded demo
  // account. Independent of password auth so a deployment can offer the tour
  // without enabling sign-ups.
  app.post('/api/auth/demo', async (_req, reply) => {
    if (!isDemoAccountEnabled()) {
      return reply.status(403).send({
        error: 'demo_disabled',
        message: 'The demo account is not available in this environment.',
      });
    }
    const user = await userRepository.findByEmail(DEMO_EMAIL);
    if (!user) {
      return reply
        .status(503)
        .send({ error: 'demo_unavailable', message: 'The demo account has not been set up yet.' });
    }

    // Reset today's entry on every demo login so each visitor starts with a
    // clean "log today" — the only day the demo lets them edit. Whatever the
    // previous visitor (or the seed) left for today is cleared, then the
    // engine recomputes so the cached status reflects the empty day.
    try {
      const today = isoToday();
      await logRepository.deleteLogByDate(user.id, today);
      await engineService.recompute(user.id, today);
      cacheService.invalidateUser(user.id);
    } catch (err) {
      _req.log.error({ err, route: 'auth/demo' }, 'demo today-reset failed');
    }

    setSessionCookie(reply, user.id);
    const onboardingCompleted = await settingsRepository.hasCompletedOnboarding(user.id);
    return reply.send({ userId: user.id, email: user.email, onboardingCompleted });
  });

  // Email + password: create account
  app.post('/api/auth/register', async (req, reply) => {
    if (!isPasswordAuthEnabled()) {
      return reply.status(403).send({
        error: 'password_auth_disabled',
        message: 'Password registration is disabled in this environment.',
      });
    }
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'invalid_input',
        message: 'Enter a valid email and a password of at least 8 characters.',
      });
    }
    const { email, password } = parsed.data;

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      return reply
        .status(409)
        .send({ error: 'email_taken', message: 'An account with this email already exists.' });
    }

    const userId = await ensureUserForEmail(userRepository, settingsRepository, email);
    await userRepository.setPassword(userId, await hashPassword(password));

    // CLOUD: don't issue a session yet — mark the account unverified, email a
    // code, and tell the client to collect it. SELF-HOSTED: the account is
    // verified by default (column default), so sign in immediately as before.
    if (isEmailVerificationEnabled()) {
      await userRepository.setEmailVerified(userId, false);
      try {
        await emailVerification.requestCode(userId, email);
      } catch (err) {
        // The code is already stored; the user can use "resend". Surface
        // nothing sensitive — just log and let them proceed to the code step.
        req.log.error({ err, route: 'auth/register' }, 'verification email send failed');
      }
      return reply.send({ email, needsVerification: true });
    }

    setSessionCookie(reply, userId);
    const onboardingCompleted = await settingsRepository.hasCompletedOnboarding(userId);
    return reply.send({ userId, email, onboardingCompleted });
  });

  // Email + password: sign in
  app.post('/api/auth/login', async (req, reply) => {
    if (!isPasswordAuthEnabled()) {
      return reply.status(403).send({
        error: 'password_auth_disabled',
        message: 'Password authentication is disabled in this environment.',
      });
    }
    const parsed = credsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'invalid_input', message: 'Enter a valid email and password.' });
    }
    const { email, password } = parsed.data;

    const user = await userRepository.findByEmail(email);
    // Same response whether the email is unknown or the password is wrong (no enumeration).
    if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
      return reply
        .status(401)
        .send({ error: 'invalid_credentials', message: 'Incorrect email or password.' });
    }

    // CLOUD: an account that never confirmed its email can't sign in. Signal
    // the client to route to the code step. (Always false in self-hosted.)
    if (isEmailVerificationEnabled() && user.email_verified === false) {
      return reply.status(403).send({
        error: 'email_not_verified',
        message: 'Please verify your email to continue.',
        needsVerification: true,
      });
    }

    setSessionCookie(reply, user.id);
    const onboardingCompleted = await settingsRepository.hasCompletedOnboarding(user.id);
    return reply.send({ userId: user.id, email: user.email, onboardingCompleted });
  });

  // CLOUD ONLY: confirm a 6-digit code. On success the account is verified and
  // a session is issued. Failure is a single generic error — it never reveals
  // whether the email exists or why the code was rejected (no enumeration).
  app.post('/api/auth/verify-email', async (req, reply) => {
    if (!isEmailVerificationEnabled()) {
      return reply.status(403).send({
        error: 'verification_disabled',
        message: 'Email verification is not required in this environment.',
      });
    }
    const parsed = verifyCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: 'invalid_input', message: 'Enter your email and the 6-digit code.' });
    }
    const { email, code } = parsed.data;

    const user = await userRepository.findByEmail(email);
    const result = user ? await emailVerification.verify(user.id, code) : 'invalid';
    if (result !== 'ok' || !user) {
      return reply
        .status(400)
        .send({ error: 'invalid_code', message: 'That code is invalid or has expired.' });
    }

    setSessionCookie(reply, user.id);
    const onboardingCompleted = await settingsRepository.hasCompletedOnboarding(user.id);
    return reply.send({ userId: user.id, email: user.email, onboardingCompleted });
  });

  // CLOUD ONLY: re-send a code. Always returns a generic success (so it can't
  // be used to probe which emails exist); the per-account cooldown and the
  // request rate limiter throttle abuse.
  app.post('/api/auth/resend-code', async (req, reply) => {
    if (!isEmailVerificationEnabled()) {
      return reply.status(403).send({
        error: 'verification_disabled',
        message: 'Email verification is not required in this environment.',
      });
    }
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_input', message: 'Enter a valid email.' });
    }
    const { email } = parsed.data;

    const user = await userRepository.findByEmail(email);
    if (user && user.email_verified === false) {
      try {
        await emailVerification.requestCode(user.id, email);
      } catch (err) {
        req.log.error({ err, route: 'auth/resend-code' }, 'verification email send failed');
      }
    }
    return reply.send({ ok: true });
  });

  app.get<{ Params: { provider: string } }>(
    '/api/auth/oauth/:provider/start',
    async (req, reply) => {
      const provider = req.params.provider as OauthProvider;
      const returnTo = safeReturnTo((req.query as any)?.returnTo);

      if (provider !== 'google') {
        return reply.status(400).send({ error: 'Unsupported provider' });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
      if (!clientId) return reply.status(500).send({ error: 'GOOGLE_CLIENT_ID not configured' });

      const state = randomUUID();
      const cookieOpts = sessionCookieOptions();
      const oauthCookieBase = {
        path: '/',
        httpOnly: true,
        sameSite: cookieOpts.sameSite,
        secure: cookieOpts.secure,
      };
      reply.setCookie('oauth_state', state, oauthCookieBase);
      reply.setCookie('oauth_return_to', returnTo, oauthCookieBase);

      const redirectUri = oauthRedirectUri('google', req);
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', redirectUri);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('prompt', 'select_account');
      url.searchParams.set('state', state);

      return reply.redirect(url.toString());
    }
  );

  app.get<{ Params: { provider: string } }>(
    '/api/auth/oauth/:provider/callback',
    async (req, reply) => {
      const provider = req.params.provider as OauthProvider;
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
      if (!clientId || !clientSecret)
        return reply.status(500).send({ error: 'Google OAuth not configured' });

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
        app.log.warn(
          { route: 'oauth/google/callback', status: tokenRes.status },
          'token exchange failed'
        );
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

        // Pass repositories to linkIdentity
        const userId = await linkIdentity(userRepository, settingsRepository, {
          provider: 'google',
          providerUserId: sub,
          email,
        });
        reply.clearCookie('oauth_state', { path: '/' });
        reply.clearCookie('oauth_return_to', { path: '/' });

        setSessionCookie(reply, userId);
        return reply.redirect(`${appBase()}${returnTo}`);
      } catch (e) {
        req.log.warn({ route: 'oauth/google/callback', err: e }, 'id_token verification failed');
        return reply.redirect(`${appBase()}/auth?error=invalid_token`);
      }
    }
  );

  app.post('/api/signout', async (_req, reply) => {
    // Be extra defensive: some browsers can be finicky about deleting cookies if attributes differ.
    // Overwrite with an expired cookie (maxAge=0 + expires) and also attempt clearCookie with/without signing.
    const cookieOpts = sessionCookieOptions();
    const base = {
      path: '/',
      httpOnly: true,
      sameSite: cookieOpts.sameSite,
      secure: cookieOpts.secure,
    };

    // Overwrite (signed)
    reply.setCookie('uid', '', {
      ...base,
      signed: true,
      maxAge: 0,
      expires: new Date(0),
    });

    // Overwrite (unsigned) - in case an older cookie exists from a prior version
    reply.setCookie('uid', '', {
      ...base,
      signed: false,
      maxAge: 0,
      expires: new Date(0),
    });

    // Also call clearCookie helpers
    reply.clearCookie('uid', { ...base, signed: true });
    reply.clearCookie('uid', { ...base, signed: false });
    return reply.send({ ok: true });
  });

  app.get('/api/session', async (req, reply) => {
    // This route is protected by the /api/* auth preHandler below.
    // If unauthenticated, the preHandler will return 401.
    const userId = req.userId;
    if (!userId) return reply.send({ userId: null, email: null, onboardingCompleted: false });

    const user = await userRepository.findById(userId);
    const email = user?.email ?? null;

    const onboardingCompleted = await settingsRepository.hasCompletedOnboarding(userId);

    return reply.send({ userId, email, onboardingCompleted });
  });

  // Unauthenticated session check endpoint
  // Returns whether the current request has a valid session without requiring auth
  app.get('/api/session/check', async (req, reply) => {
    const unsigned = req.cookies.uid ? req.unsignCookie(req.cookies.uid) : null;
    const uid = unsigned && unsigned.valid ? (unsigned.value ?? null) : null;

    if (!uid) {
      return reply.send({ authenticated: false });
    }

    // Verify the user still exists in the database
    try {
      const user = await userRepository.findById(uid);
      const authenticated = !!user;
      return reply.send({ authenticated });
    } catch (error) {
      req.log.error({ error, userId: uid }, 'session check database error');
      return reply.send({ authenticated: false });
    }
  });
}
