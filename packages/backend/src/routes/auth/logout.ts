import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import { REFRESH_COOKIE_NAME } from '../../plugins/auth'
import { UserRepository } from '../../repositories/user-repository'
import { runRouteEffect } from '../../utils/route-effect'

export const logoutRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/auth/logout',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.jwtPayload!.userId
      const refreshToken = request.cookies[REFRESH_COOKIE_NAME]

      const effect = Effect.gen(function* () {
        const userRepo = yield* UserRepository
        yield* userRepo.clearAuthToken(userId)

        yield* Effect.promise(async () => {
          fastify.clearAuthCookie(reply)
          await fastify.clearRefreshSession(reply, refreshToken)
        })

        return { message: 'Logged out successfully' }
      })

      return runRouteEffect(fastify, reply, {
        effect,
        fallbackMessage: 'Failed to logout',
      })
    }
  )
}
