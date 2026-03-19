// oxlint-disable-next-line import/no-unassigned-import
import 'dotenv/config'
import { fastify } from './fastify'
import { resolveConfig } from './services/config-service'

const start = async () => {
  try {
    const config = resolveConfig()
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server is running on http://localhost:${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
