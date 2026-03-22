import Fastify from 'fastify';

import { fastifyAuthPlugin } from './plugins/auth';
import { prismaPlugin } from './plugins/database';
import { runtimePlugin } from './plugins/effect-runtime';
import { fastifyRedisPlugin } from './plugins/redis';
import { schemaValidationPlugin } from './plugins/schema-validation';
import { articleRoutes } from './routes/articles';
import { authRoutes } from './routes/auth';
import { siteRoutes } from './routes/sites';
import { resolveConfig } from './services/config-service';

export const fastify = Fastify({
  logger: true,
});

await fastify.register(prismaPlugin);
await fastify.register(fastifyRedisPlugin);
await fastify.register(runtimePlugin);
await fastify.register(fastifyAuthPlugin);
await fastify.register(schemaValidationPlugin);

await fastify.register(import('@fastify/cors'), {
  origin: resolveConfig().appUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await fastify.register(authRoutes, { prefix: '/api' });
await fastify.register(siteRoutes, { prefix: '/api' });
await fastify.register(articleRoutes, { prefix: '/api' });

fastify.get('/', async () => {
  return { message: 'Inland CMS Backend with Effect-TS!' };
});

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/health/db', async (_, reply) => {
  try {
    await fastify.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    reply.code(500);
    return {
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
