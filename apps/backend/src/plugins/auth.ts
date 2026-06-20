import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { extractApiKey, hashApiKey } from '../apiKeys.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';

declare module 'fastify' {
    interface FastifyRequest {
        userId?: string;
        authType?: 'cookie' | 'api_key';
        apiKeyId?: string;
    }
}

interface AuthPluginOptions {
    userRepository: UserRepository;
    apiKeyRepository: ApiKeyRepository;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, opts) => {
    const { userRepository, apiKeyRepository } = opts;

    fastify.decorateRequest('userId', undefined);
    fastify.decorateRequest('authType', undefined);
    fastify.decorateRequest('apiKeyId', undefined);

    fastify.addHook('onRequest', async (req, reply) => {
        // Skip auth for non-API routes or specific public API routes
        const isApiRoute = req.url.startsWith('/api/');
        const isPublicRoute =
            req.url.startsWith('/api/auth/oauth/') ||
            req.url === '/api/auth/register' ||
            req.url === '/api/auth/login' ||
            req.url === '/api/auth/demo' ||
            req.url === '/api/auth/providers' ||
            req.url === '/api/signout' ||
            req.url === '/api/session/check' ||
            req.url.startsWith('/api/waitlist') ||
            req.url === '/health';

        if (!isApiRoute || isPublicRoute) {
            return;
        }

        // 1. Try Cookie Auth
        const unsigned = req.cookies.uid ? req.unsignCookie(req.cookies.uid) : null;
        const uid = unsigned && unsigned.valid ? (unsigned.value ?? null) : null;

        if (uid) {
            const user = await userRepository.findById(uid);
            if (!user) {
                req.log.warn({ uid }, 'Session orphan: User not found in database. Clearing cookie.');
                reply.clearCookie('uid', { path: '/' });
                return reply.status(401).send({ error: 'Session invalid: User not found' });
            }
            req.userId = uid;
            req.authType = 'cookie';
            return;
        }

        // 2. Try API Key Auth
        const apiKey = extractApiKey(req);
        if (apiKey) {
            const path = req.url.split('?')[0] ?? req.url;
            const apiKeyAllowed = req.method === 'PUT' && path.startsWith('/api/v1/logs/');

            if (!apiKeyAllowed) {
                return reply.status(403).send({ error: 'API key not allowed for this endpoint' });
            }

            const keyHash = hashApiKey(apiKey);
            const record = await apiKeyRepository.findActiveByHash(keyHash);
            
            if (!record) {
                return reply.status(401).send({ error: 'Invalid API key' });
            }

            req.userId = record.user_id;
            req.authType = 'api_key';
            req.apiKeyId = record.id;
            
            await apiKeyRepository.touchLastUsed(record.id);
            return;
        }

        return reply.status(401).send({ error: 'Not authenticated' });
    });
};

export default fp(authPlugin, {
    name: 'auth-plugin',
    dependencies: ['@fastify/cookie']
});
