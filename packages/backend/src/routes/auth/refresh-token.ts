import type { FastifyInstance } from 'fastify'

export const refreshTokenRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/auth/refresh',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!
      const { userId, username, email } = userPayload

      const newToken = fastify.jwt.sign({
        userId,
        username,
        email,
      })

      return reply.send({ token: newToken })
    }
  )
}
