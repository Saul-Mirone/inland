import Fastify from 'fastify'

import { fastifyAuthPlugin } from './plugins/auth'
import { prismaPlugin } from './plugins/database'
import { authEffectRoutes } from './routes/auth'

export const fastify = Fastify({
  logger: true,
})

// Register database plugin
await fastify.register(prismaPlugin)

// Register authentication plugin
await fastify.register(fastifyAuthPlugin)

// Register CORS plugin
await fastify.register(import('@fastify/cors'), {
  origin: true,
})

// Register Effect-based auth routes
await fastify.register(authEffectRoutes)

// Routes
fastify.get('/', async () => {
  return { message: 'Inland CMS Backend with Effect-TS!' }
})

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Database health check route
fastify.get('/health/db', async (_, reply) => {
  try {
    await fastify.prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  } catch (error) {
    reply.code(500)
    return {
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
})
