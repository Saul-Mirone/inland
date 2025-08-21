import Fastify from 'fastify'

export const fastify = Fastify({
  logger: true,
})

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
