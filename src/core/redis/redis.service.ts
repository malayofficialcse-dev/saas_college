// ==============================================================================
// CollegeQuery SaaS — Redis Service
// ==============================================================================

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private pubClient!: Redis;
  private subClient!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    const redisOptions = {
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    };

    this.client = new Redis(redisOptions);
    this.pubClient = new Redis(redisOptions);
    this.subClient = new Redis(redisOptions);

    this.client.connect().then(() => {
      this.logger.log(`✅ Redis connected at ${host}:${port}`);
    }).catch((err) => {
      this.logger.warn(`Redis connection deferred: ${err.message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  getPubClient(): Redis {
    return this.pubClient;
  }

  getSubClient(): Redis {
    return this.subClient;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK' | null> {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.pubClient.publish(channel, message);
  }

  async onModuleDestroy() {
    await this.client?.quit();
    await this.pubClient?.quit();
    await this.subClient?.quit();
    this.logger.log('Redis connections closed.');
  }
}
