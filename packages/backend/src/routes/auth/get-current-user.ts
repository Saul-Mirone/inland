import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import { UserService } from '../../services/user'
import { runRouteEffect } from '../../utils/route-effect'

export const getCurrentUserRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/auth/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserInfo = Effect.gen(function* () {
        const userService = yield* UserService
        const user = yield* userService.findUserById(userPayload.userId)

        return {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            gitIntegrations: user.gitIntegrations.map((integration) => ({
              platform: integration.platform,
              platformUsername: integration.platformUsername,
            })),
          },
        }
      })

      return runRouteEffect(fastify, reply, {
        effect: getUserInfo,
        errors: {
          UserNotFoundError: () => ({
            status: 404,
            error: 'User not found',
          }),
        },
        fallbackMessage: 'Failed to fetch user info',
      })
    }
  )
}
