import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { UserRepository } from '../repositories/UserRepository.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

interface AuthPluginOptions {
  userRepository: UserRepository;
}

const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (fastify, opts) => {
  const { userRepository } = opts;

  fastify.decorateRequest('userId', undefined);

  fastify.addHook('onRequest', async (req, reply) => {
    // Skip auth for non-API routes or specific public API routes
    const isApiRoute = req.url.startsWith('/api/');
    const isPublicRoute =
      req.url.startsWith('/api/auth/oauth/') ||
      req.url === '/api/auth/register' ||
      req.url === '/api/auth/login' ||
      req.url === '/api/auth/verify-email' ||
      req.url === '/api/auth/resend-code' ||
      req.url === '/api/auth/demo' ||
      req.url === '/api/auth/providers' ||
      req.url === '/api/signout' ||
      req.url === '/api/session/check' ||
      req.url === '/api/billing/webhook' ||
      req.url.startsWith('/api/waitlist') ||
      req.url.startsWith('/api/admin/') ||
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
      return;
    }

    return reply.status(401).send({ error: 'Not authenticated' });
  });
};

export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: ['@fastify/cookie'],
});
