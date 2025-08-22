import { fastify } from './fastify'

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
    fastify.log.info('Server is running on http://localhost:3001')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
