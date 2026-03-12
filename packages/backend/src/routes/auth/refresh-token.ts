import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import * as AuthService from '../../services/auth-service'
import { UserService } from '../../services/user'
import { runRouteEffect } from '../../utils/route-effect'

export const refreshTokenRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/auth/refresh',
    {
      preHandler: [fastify.authenticateRefresh],
    },
    async (request, reply) => {
      const userId = request.jwtPayload!.userId
      const refreshToken = request.refreshToken

      const refreshSession = Effect.gen(function* () {
        const userService = yield* UserService
        const user = yield* userService.findUserById(userId)
        const sessionPayload = AuthService.generateJWTPayload(user)

        yield* Effect.tryPromise({
          try: async () => {
            await fastify.clearRefreshSession(reply, refreshToken)
            await fastify.createRefreshSession(reply, sessionPayload)
            await fastify.setAuthCookie(reply, sessionPayload)
          },
          catch: () =>
            new AuthService.TokenGenerationError({
              reason: 'Failed to refresh session cookies',
            }),
        })

        return { message: 'Session refreshed' }
      })

      return runRouteEffect(fastify, reply, {
        effect: refreshSession,
        errors: {
          UserNotFoundError: () => ({
            status: 401,
            error: 'User not found',
          }),
          TokenGenerationError: () => ({
            status: 500,
            error: 'Failed to refresh session',
          }),
        },
        fallbackMessage: 'Failed to refresh token',
      })
    }
  )
}
