import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import { REFRESH_COOKIE_NAME } from '../../plugins/auth'
import { AuthService } from '../../services/auth'
import { HttpError, runRouteEffect } from '../../utils/route-effect'

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
        const authService = yield* AuthService
        yield* authService.clearUserAuth(userId)

        yield* Effect.tryPromise({
          try: async () => {
            fastify.clearAuthCookie(reply)
            await fastify.clearRefreshSession(reply, refreshToken)
          },
          catch: () =>
            new HttpError({
              status: 500,
              message: 'Failed to clear session',
            }),
        })

        return { message: 'Logged out successfully' }
      })

      return runRouteEffect(fastify, reply, effect, {
        fallbackMessage: 'Failed to logout',
      })
    }
  )
}
