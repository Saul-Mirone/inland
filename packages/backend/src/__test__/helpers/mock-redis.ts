import type { Redis } from 'ioredis';

import { Layer } from 'effect';
import { type DeepMockProxy, mockDeep, mockReset } from 'vitest-mock-extended';

import { RedisService } from '../../services/redis-service';

export const mockRedis = mockDeep<Redis>();

export const resetMockRedis = () => {
  mockReset(mockRedis);
};

export const TestRedisServiceLayer = Layer.succeed(
  RedisService,
  RedisService.of({
    client: mockRedis as unknown as Redis,
  })
);

export type MockRedis = DeepMockProxy<Redis>;
