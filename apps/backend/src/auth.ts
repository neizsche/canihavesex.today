import { randomUUID } from 'node:crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import type { UserRepository } from './repositories/UserRepository.js';
import type { SettingsRepository } from './repositories/SettingsRepository.js';
import { isPasswordAuthDefaultEnabled, isCookieSecureRequired } from './config.js';

export type OauthProvider = 'google' | 'apple';

export type GoogleIdTokenPayload = TokenPayload;

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string
): Promise<GoogleIdTokenPayload> {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error('invalid_token_payload');
  return payload;
}

export function publicBackendBase(req: any): string {
  const configured = process.env.PUBLIC_BACKEND_BASE;
  if (configured) return configured.replace(/\/$/, '');
  // In same-origin / proxied setups, the backend is accessed via the app's base URL.
  return appBase();
}

export function appBase(): string {
  return (process.env.PUBLIC_APP_BASE ?? 'http://localhost:3112').replace(/\/$/, '');
}

export function oauthRedirectUri(provider: OauthProvider, req: any): string {
  // publicBackendBase already includes /api if PUBLIC_BACKEND_BASE is set
  // So we only need to add /auth/oauth/... not /api/auth/oauth/...
  const base = publicBackendBase(req);
  // Check if base already ends with /api, if so, don't add it again
  if (base.endsWith('/api')) {
    return `${base}/auth/oauth/${provider}/callback`;
  }
  // Otherwise, add /api for backwards compatibility
  return `${base}/api/auth/oauth/${provider}/callback`;
}

export async function ensureUserForEmail(
  userRepository: UserRepository,
  settingsRepository: SettingsRepository,
  email: string
): Promise<string> {
  const now = new Date().toISOString();
  const existing = await userRepository.findByEmail(email);
  const userId = existing?.id ?? randomUUID();

  if (!existing) {
    await userRepository.create({
      id: userId,
      email,
      created_at: now,
    });

    // Create the default settings row (dark theme, defaults).
    await settingsRepository.createDefault(userId);

    // NOTE: We no longer create a default "Cycle" here.
    // The V5 engine handles new users (empty state) gracefully.
  }

  return userId;
}

export async function linkIdentity(
  userRepository: UserRepository,
  settingsRepository: SettingsRepository,
  params: {
    provider: OauthProvider;
    providerUserId: string;
    email: string;
  }
): Promise<string> {
  const now = new Date().toISOString();

  const existing = await userRepository.findIdentityByProvider(
    params.provider,
    params.providerUserId
  );

  if (existing) return existing.user_id;

  const userId = await ensureUserForEmail(userRepository, settingsRepository, params.email);
  const identityId = randomUUID();

  await userRepository.createIdentity({
    id: identityId,
    user_id: userId,
    provider: params.provider,
    provider_user_id: params.providerUserId,
    email: params.email,
    created_at: now,
  });
  return userId;
}

export function safeReturnTo(v: unknown): string {
  const s = typeof v === 'string' ? v : '';
  if (!s) return '/';
  if (!s.startsWith('/')) return '/';
  if (s.startsWith('//')) return '/';
  return s;
}

/** Whether Google OAuth is configured via env (drives the providers endpoint). */
export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Whether email/password authentication is enabled. Defaults to false in production unless self-hosted. */
export function isPasswordAuthEnabled(): boolean {
  const envVal = process.env.ENABLE_PASSWORD_AUTH;
  if (envVal === 'false') return false;
  if (envVal === 'true') return true;
  if (isPasswordAuthDefaultEnabled()) return true;
  return process.env.NODE_ENV !== 'production';
}

export function sessionCookieOptions() {
  // COOKIE_SAMESITE=none enables cross-domain cookies (split frontend/backend);
  // default 'lax' is correct for the same-origin single-image deployment.
  const sameSite = process.env.COOKIE_SAMESITE === 'none' ? ('none' as const) : ('lax' as const);
  const secure = isCookieSecureRequired() || sameSite === 'none';

  return { path: '/', httpOnly: true, sameSite, secure } as const;
}

/** Issue the signed `uid` session cookie (shared by OAuth and email/password). */
export function setSessionCookie(reply: any, userId: string): void {
  reply.setCookie('uid', userId, {
    ...sessionCookieOptions(),
    signed: true,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}
