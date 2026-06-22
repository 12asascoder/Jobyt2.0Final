import Redis from 'ioredis';
import prisma from '../../config/prisma';
import crypto from 'crypto';

export interface CacheProvider {
  get(key: string): Promise<any | null>;
  set(key: string, value: any, ttlSeconds: number): Promise<void>;
}

class RedisCacheProvider implements CacheProvider {
  private client: Redis | null = null;

  constructor() {
    if (process.env.REDIS_HOST) {
      this.client = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        retryStrategy: () => null, // don't retry forever if it's down
      });

      this.client.on('error', (err) => {
        console.warn('[RedisCache] Connection failed, falling back to memory/DB:', err.message);
        this.client?.disconnect();
        this.client = null;
      });
    }
  }

  async get(key: string): Promise<any | null> {
    if (!this.client) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (e) {
      // ignore
    }
  }
}

class DatabaseCacheProvider implements CacheProvider {
  async get(key: string): Promise<any | null> {
    const record = await prisma.ai_response_cache.findUnique({ where: { cache_key: key } });
    if (!record) return null;
    if (record.expires_at < new Date()) {
      await prisma.ai_response_cache.delete({ where: { cache_key: key } }).catch(() => {});
      return null;
    }
    return record.response;
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.ai_response_cache.upsert({
      where: { cache_key: key },
      create: { cache_key: key, response: value, expires_at: expiresAt, model_used: 'unknown' },
      update: { response: value, expires_at: expiresAt },
    }).catch(() => {});
  }
}

export const AIResponseCache = new (class {
  redis = new RedisCacheProvider();
  db = new DatabaseCacheProvider();

  public generateKey(module: string, prompt: string, model: string): string {
    const hash = crypto.createHash('sha256').update(`${module}:${model}:${prompt}`).digest('hex');
    return `ai_cache:${module}:${hash}`;
  }

  async getCache(key: string): Promise<any | null> {
    let result = await this.redis.get(key);
    if (result) return result;

    result = await this.db.get(key);
    if (result) {
      // Re-warm redis
      await this.redis.set(key, result, 86400);
      return result;
    }
    return null;
  }

  async setCache(key: string, value: any, ttlSeconds: number = 86400 * 7): Promise<void> { // 7 days default
    await this.redis.set(key, value, Math.min(ttlSeconds, 86400));
    await this.db.set(key, value, ttlSeconds);
  }
})();
