import type { FastifyInstance } from 'fastify'

export const logoutRoute = async (fastify: FastifyInstance) => {
  fastify.post('/auth/logout', async () => {
    return { message: 'Logged out successfully' }
  })
}
