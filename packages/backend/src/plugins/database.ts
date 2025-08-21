import type { FastifyInstance } from 'fastify'

import fp from 'fastify-plugin'

import { prisma } from '../database/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma
  }
}

async function databasePlugin(fastify: FastifyInstance) {
  // Add prisma to fastify instance
  fastify.decorate('prisma', prisma)

  // Test database connection
  try {
    await prisma.$connect()
    fastify.log.info('Database connected successfully')
  } catch (error) {
    fastify.log.error(error, 'Failed to connect to database')
    throw error
  }

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect()
    fastify.log.info('Database disconnected')
  })
}

export default fp(databasePlugin, {
  name: 'database',
})
