import { LRUCache } from 'lru-cache';

class CacheService {
  private cache: LRUCache<string, any>;

  constructor() {
    this.cache = new LRUCache({
      max: 500, // Store insights for up to 500 users
      ttl: 1000 * 60 * 10, // 10 minutes default TTL
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T;
  }

  set(key: string, value: any, ttl?: number): void {
    this.cache.set(key, value, { ttl });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidates all cache entries for a specific user.
   * We use a naming convention like `user:${userId}:*`
   */
  invalidateUser(userId: string): void {
    const keysToExclude: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`user:${userId}:`)) {
        keysToExclude.push(key);
      }
    }
    keysToExclude.forEach((k) => this.cache.delete(k));
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();
