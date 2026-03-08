import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import * as SiteService from '../../services/site'
import { runRouteEffect } from '../../utils/route-effect'

export const getUserSitesRoute = async (fastify: FastifyInstance) => {
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

      return runRouteEffect(fastify, reply, {
        effect: getUserSites,
        fallbackMessage: 'Failed to fetch sites',
      })
    }
  )
}
