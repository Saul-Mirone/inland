import Fastify from 'fastify'

import databasePlugin from './plugins/database'

export const fastify = Fastify({
  logger: true,
})

// Register database plugin
await fastify.register(databasePlugin)

// Register CORS plugin
await fastify.register(import('@fastify/cors'), {
  origin: true,
})

// Routes
fastify.get('/', async () => {
  return { message: 'Hello World!' }
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
