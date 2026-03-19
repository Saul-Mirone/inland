import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { SiteService } from '../../services/site'
import { httpError, runRouteEffect } from '../../utils/route-effect'

export const getSiteByIdRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/sites/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteParam,
        }),
      ],
    },
    async (request: TypedFastifyRequest<never, Schemas.SiteParam>, reply) => {
      const userPayload = request.jwtPayload!
      const { id } = request.validatedParams!

      const getSite = Effect.gen(function* () {
        const siteService = yield* SiteService
        const site = yield* siteService.findSiteById(id, userPayload.userId)
        return { site }
      })

      return runRouteEffect(
        fastify,
        reply,
        getSite.pipe(
          Effect.catchTags({
            SiteNotFoundError: () => httpError(404, 'Site not found'),
            SiteAccessDeniedError: () => httpError(403, 'Access denied'),
          })
        ),
        { fallbackMessage: 'Failed to fetch site' }
      )
    }
  )
}
