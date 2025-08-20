import Fastify from 'fastify'

const fastify = Fastify({
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

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    fastify.log.info('Server is running on http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
