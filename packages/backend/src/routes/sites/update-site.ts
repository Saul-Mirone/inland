import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { SiteService } from '../../services/site'
import { httpError, runRouteEffect } from '../../utils/route-effect'

export const updateSiteRoute = async (fastify: FastifyInstance) => {
  fastify.put(
    '/sites/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteParam,
          body: Schemas.UpdateSiteData,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<Schemas.UpdateSiteData, Schemas.SiteParam>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { id } = request.validatedParams!
      const updateData = request.validatedBody!

      const effect = Effect.gen(function* () {
        const siteService = yield* SiteService
        const site = yield* siteService.updateSite(
          id,
          userPayload.userId,
          updateData
        )
        return { site }
      })

      return runRouteEffect(
        fastify,
        reply,
        effect.pipe(
          Effect.catchTags({
            SiteNotFoundError: () => httpError(404, 'Site not found'),
            SiteAccessDeniedError: () => httpError(403, 'Access denied'),
            SiteUpdateError: (e) => httpError(500, e.reason),
            DuplicateSiteNameError: () =>
              httpError(409, 'A site with this name already exists'),
            SiteValidationError: (e) => httpError(400, e.message),
          })
        ),
        { fallbackMessage: 'Failed to update site' }
      )
    }
  )
}
