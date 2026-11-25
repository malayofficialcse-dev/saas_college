import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext, Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: any;
  private readonly adapterLogger = new Logger(RedisIoAdapter.name);

  constructor(
    app: INestApplicationContext,
    private readonly configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
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

    const pubClient = new Redis(redisOptions);
    const subClient = new Redis(redisOptions);

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.adapterLogger.log('✅ Socket.IO Redis Pub/Sub adapter connected successfully for multi-instance scaling.');
    } catch (err: any) {
      this.adapterLogger.warn(`Redis adapter connection deferred: ${err.message}. Falling back to single-node in-memory adapter.`);
    }
  }

  override createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
