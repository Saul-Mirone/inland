import type { Redis } from 'ioredis';

import { Context, Layer } from 'effect';

export class RedisService extends Context.Tag('RedisService')<
  RedisService,
  {
    readonly client: Redis;
  }
>() {}

export const makeRedisService = (redisClient: Redis) =>
  Layer.succeed(RedisService, { client: redisClient });
