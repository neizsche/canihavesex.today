import { randomUUID } from 'node:crypto';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import type { UserRepository } from './repositories/UserRepository.js';
import type { CycleRepository } from './repositories/CycleRepository.js';
import type { PreferencesRepository } from './repositories/PreferencesRepository.js';

export type OauthProvider = 'google' | 'apple';

export type GoogleIdTokenPayload = TokenPayload;

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdTokenPayload> {
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
    const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'http';
    const host = (req.headers['x-forwarded-host'] as string | undefined) ?? (req.headers.host as string | undefined) ?? 'localhost:1299';
    return `${proto}://${host}`.replace(/\/$/, '');
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
    preferencesRepository: PreferencesRepository,
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

        // Create default preferences with dark theme
        await preferencesRepository.createDefault(userId);

        // NOTE: We no longer create a default "Cycle" here.
        // The V5 engine handles new users (empty state) gracefully.
    }

    return userId;
}

export async function linkIdentity(
    userRepository: UserRepository,
    preferencesRepository: PreferencesRepository,
    params: {
        provider: OauthProvider;
        providerUserId: string;
        email: string;
    }
): Promise<string> {
    const now = new Date().toISOString();

    const existing = await userRepository.findIdentityByProvider(params.provider, params.providerUserId);

    if (existing) return existing.user_id;

    const userId = await ensureUserForEmail(userRepository, preferencesRepository, params.email);
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
