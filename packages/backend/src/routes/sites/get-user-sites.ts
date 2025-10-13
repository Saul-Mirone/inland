import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import * as SiteService from '../../services/site'
import { createAppRuntime } from '../../utils/effect-runtime'

export const getUserSitesRoute = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  fastify.get(
    '/sites',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserSites = Effect.gen(function* () {
        const sites = yield* SiteService.findUserSites(userPayload.userId)
        return { sites }
      })

      return runtime.runPromise(
        getUserSites.pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply.code(500).send({ error: 'Failed to fetch sites' })
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
