import type { FastifyInstance } from 'fastify';

import redis from '@fastify/redis';
import fastifyPlugin from 'fastify-plugin';

import { resolveConfig } from '../services/config-service';

async function redisPlugin(fastify: FastifyInstance) {
  const config = resolveConfig();

  await fastify.register(redis, {
    url: config.redisUrl,
  });
}

export const fastifyRedisPlugin = fastifyPlugin(redisPlugin, {
  name: 'redis',
});
