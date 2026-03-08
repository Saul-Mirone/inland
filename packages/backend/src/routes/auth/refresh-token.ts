import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import { UserRepository } from '../../repositories/user-repository'
import { runRouteEffect } from '../../utils/route-effect'

export const refreshTokenRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/auth/refresh',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.jwtPayload!.userId

      const effect = Effect.gen(function* () {
        const userRepo = yield* UserRepository
        const user = yield* userRepo.findById(userId)

        if (!user) {
          return reply.code(401).send({ error: 'User not found' })
        }

        const newToken = fastify.jwt.sign({
          userId: user.id,
          username: user.username,
          email: user.email,
        })

        return { token: newToken }
      })

      return runRouteEffect(fastify, reply, {
        effect,
        fallbackMessage: 'Failed to refresh token',
      })
    }
  )
}
