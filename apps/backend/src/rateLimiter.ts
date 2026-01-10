// Simple in-memory rate limiter for basic DoS protection
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutes
    private maxRequests: number = 100, // requests per window
    private cleanupMs: number = 5 * 60 * 1000 // cleanup every 5 minutes
  ) {
    // Clean up expired entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupMs);
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry) {
      // First request from this identifier
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (now > entry.resetTime) {
      // Window has expired, reset
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return true;
    }

    // Increment counter
    entry.count++;
    return false;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return this.maxRequests;

    const now = Date.now();
    if (now > entry.resetTime) return this.maxRequests;

    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    return entry?.resetTime ?? Date.now() + this.windowMs;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  // Graceful shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Rate limiting middleware for Fastify
export function createRateLimitMiddleware(options: {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
} = {}) {
  const limiter = new RateLimiter(
    options.windowMs,
    options.maxRequests
  );

  return async function rateLimitMiddleware(req: any, reply: any) {
    // Prefer a stable authenticated identifier when possible.
    // Falls back to IP-based limiting for unauthenticated requests.
    const uid = typeof req.userId === 'string' && req.userId ? req.userId : null;
    const identifier = uid || req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (limiter.isRateLimited(identifier)) {
      const resetTime = limiter.getResetTime(identifier);
      const remaining = limiter.getRemainingRequests(identifier);

      req.log.warn({
        route: req.url,
        identifier: uid ? 'user' : 'ip',
        userId: uid ?? undefined,
      }, 'rate limit exceeded');

      return reply.status(429).send({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
        remaining,
      });
    }

    // Add rate limit headers to response
    const remaining = limiter.getRemainingRequests(identifier);
    const resetTime = limiter.getResetTime(identifier);

    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
    reply.header('X-RateLimit-Limit', options.maxRequests || 100);
  };
}

// Cleanup on process exit
process.on('SIGINT', () => rateLimiter.destroy());
process.on('SIGTERM', () => rateLimiter.destroy());