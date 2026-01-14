import { createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { UserRepository } from './repositories/UserRepository.js';
import type { CycleRepository } from './repositories/CycleRepository.js';
import type { PreferencesRepository } from './repositories/PreferencesRepository.js';

export type OauthProvider = 'google' | 'apple';

export type JwtHeader = {
    alg?: string;
    kid?: string;
    typ?: string;
};

export type GoogleJwk = {
    kty: string;
    kid: string;
    use?: string;
    alg?: string;
    n?: string;
    e?: string;
    x5c?: string[];
};

export type GoogleIdTokenPayload = {
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
    if (Array.isArray(aud)) return aud.filter((x) => typeof x === 'string') as string[];
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

    const jwk = params.jwks.find((k) => k.kid === kid);
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

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdTokenPayload> {
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
    cycleRepository: CycleRepository,
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

        const cycleId = randomUUID();
        const startDate = now.slice(0, 10);
        await cycleRepository.create({
            id: cycleId,
            user_id: userId,
            start_date: startDate,
            state: 'INFERTILE_PRE',
            peak_date: null,
            temp_shift_confirmed_date: null,
            created_at: now,
        });
    }

    return userId;
}

export async function linkIdentity(
    userRepository: UserRepository,
    cycleRepository: CycleRepository,
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

    const userId = await ensureUserForEmail(userRepository, cycleRepository, preferencesRepository, params.email);
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
