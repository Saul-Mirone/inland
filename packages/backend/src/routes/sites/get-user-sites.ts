import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { SiteService } from '../../services/site'
import { toPaginatedResponse } from '../../utils/pagination-response'
import { runRouteEffect } from '../../utils/route-effect'

export const getUserSitesRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/sites',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          querystring: Schemas.PaginationParams,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, unknown, Schemas.PaginationParams>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { page, limit } = request.validatedQuery!

      const getUserSites = Effect.gen(function* () {
        const siteService = yield* SiteService
        const result = yield* siteService.findUserSites(userPayload.userId, {
          page,
          limit,
        })
        return toPaginatedResponse('sites', result)
      })

      return runRouteEffect(fastify, reply, getUserSites, {
        fallbackMessage: 'Failed to fetch sites',
      })
    }
  )
}
