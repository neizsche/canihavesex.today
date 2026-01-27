import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import type { UserRepository } from '../repositories/UserRepository.js';
import type { PreferencesRepository } from '../repositories/PreferencesRepository.js';
import {
    appBase,
    linkIdentity,
    oauthRedirectUri,
    OauthProvider,
    publicBackendBase,
    safeReturnTo,
    verifyGoogleIdToken,
} from '../auth.js';

export async function authRoutes(
    app: FastifyInstance,
    opts: { userRepository: UserRepository; preferencesRepository: PreferencesRepository }
) {
    const { userRepository, preferencesRepository } = opts;

    app.get<{ Params: { provider: string } }>('/api/auth/oauth/:provider/start', async (req, reply) => {
        const provider = req.params.provider as OauthProvider;
        const returnTo = safeReturnTo((req.query as any)?.returnTo);

        if (provider !== 'google') {
            return reply.status(400).send({ error: 'Unsupported provider' });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
        if (!clientId) return reply.status(500).send({ error: 'GOOGLE_CLIENT_ID not configured' });

        const state = randomUUID();
        // Support cross-domain cookies when frontend and backend are on different domains
        const sameSite = process.env.COOKIE_SAMESITE === 'none' ? 'none' as const : 'lax' as const;
        const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
        const oauthCookieBase = {
            path: '/',
            httpOnly: true,
            sameSite,
            secure,
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
    });

    app.get<{ Params: { provider: string } }>('/api/auth/oauth/:provider/callback', async (req, reply) => {
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

            // Pass repositories to linkIdentity
            const userId = await linkIdentity(userRepository, preferencesRepository, { provider: 'google', providerUserId: sub, email });
            reply.clearCookie('oauth_state', { path: '/' });
            reply.clearCookie('oauth_return_to', { path: '/' });

            // Support cross-domain cookies when frontend and backend are on different domains
            // Set COOKIE_SAMESITE=none for cross-domain, or leave unset/default to 'lax' for same-domain
            const sameSite = process.env.COOKIE_SAMESITE === 'none' ? 'none' as const : 'lax' as const;
            const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';

            reply.setCookie('uid', userId, {
                path: '/',
                httpOnly: true,
                sameSite,
                signed: true,
                secure,
                // fastify/cookie uses seconds (Set-Cookie Max-Age)
                maxAge: 30 * 24 * 60 * 60, // 30 days
            });
            return reply.redirect(`${appBase()}${returnTo}`);
        } catch (e) {
            req.log.warn({ route: 'oauth/google/callback', err: e }, 'id_token verification failed');
            return reply.redirect(`${appBase()}/auth?error=invalid_token`);
        }
    });

    // ... (Signout and Session routes remain unchanged but omitted for brevity in this replace block if not needed, 
    // BUT replace_file_content needs strict range. I'll include the whole file content to be safe or break it down if I can match the top part.)
    // Actually, I can just replace the top part and get the params right.

    app.post('/api/signout', async (_req, reply) => {
        // Be extra defensive: some browsers can be finicky about deleting cookies if attributes differ.
        // Overwrite with an expired cookie (maxAge=0 + expires) and also attempt clearCookie with/without signing.
        const sameSite = process.env.COOKIE_SAMESITE === 'none' ? 'none' as const : 'lax' as const;
        const secure = process.env.NODE_ENV === 'production' || sameSite === 'none';
        const base = {
            path: '/',
            httpOnly: true,
            sameSite,
            secure,
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
        const userId = (req as any).userId as string | undefined;
        if (!userId) return reply.send({ userId: null, email: null });

        const user = await userRepository.findById(userId);
        const email = user?.email ?? null;
        return reply.send({ userId, email });
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
