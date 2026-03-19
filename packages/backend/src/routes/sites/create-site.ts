import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { SiteService } from '../../services/site'
import { httpError, runRouteEffect } from '../../utils/route-effect'

export const createSiteRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/sites',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          body: Schemas.CreateSiteData,
        }),
      ],
    },
    async (request: TypedFastifyRequest<Schemas.CreateSiteData>, reply) => {
      const userPayload = request.jwtPayload!
      const { name, description, author } = request.validatedBody!

      const createSite = Effect.gen(function* () {
        const siteService = yield* SiteService

        const validName = yield* siteService.validateSiteName(name)

        const site = yield* siteService.createSite({
          userId: userPayload.userId,
          name: validName,
          description,
          author,
        })

        return { site }
      })

      return runRouteEffect(
        fastify,
        reply,
        createSite.pipe(
          Effect.catchTags({
            AuthTokenError: () =>
              httpError(
                401,
                'Your connection has expired. Please reconnect your account.'
              ),
            DuplicateSiteNameError: () =>
              httpError(409, 'A site with this name already exists'),
            SiteCreationError: () => httpError(500, 'Failed to create site'),
            SiteValidationError: (e) => httpError(400, e.message),
          })
        ),
        {
          fallbackMessage: 'Failed to create site',
          successCode: 201,
        }
      )
    }
  )
}
