import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import * as UserService from '../../services/user'

export const getCurrentUserRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/auth/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserInfo = Effect.gen(function* () {
        const user = yield* UserService.findUserById(userPayload.userId)

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

      return fastify.runtime.runPromise(
        getUserInfo.pipe(
          Effect.catchTag('UserNotFoundError', () =>
            Effect.sync(() => reply.code(404).send({ error: 'User not found' }))
          ),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply
                  .code(500)
                  .send({ error: 'Failed to fetch user info' })
              }),
            onSuccess: (result) =>
              Effect.sync(() => {
                return reply.send(result)
              }),
          })
        )
      )
    }
  )
}
