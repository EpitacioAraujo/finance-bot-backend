import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from './env';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (): Redis =>
        new Redis({
          host: env.redis.host,
          port: env.redis.port,
          maxRetriesPerRequest: null,
        }),
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
