import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'
import { runRouteEffect } from '../../utils/route-effect'

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

      const updateSite = Effect.gen(function* () {
        const validatedData: {
          name?: string
          gitRepo?: string
          platform?: string
          deployStatus?: string
        } = {}

        if (updateData.name) {
          validatedData.name = yield* SiteService.validateSiteName(
            updateData.name
          )
        }

        if (updateData.gitRepo) {
          validatedData.gitRepo = yield* SiteService.validateGitRepo(
            updateData.gitRepo
          )
        }

        if (updateData.platform) {
          validatedData.platform = updateData.platform
        }

        if (updateData.deployStatus) {
          validatedData.deployStatus = updateData.deployStatus
        }

        const site = yield* SiteService.updateSite(
          id,
          userPayload.userId,
          validatedData
        )

        return { site }
      })

      return runRouteEffect(fastify, reply, {
        effect: updateSite,
        errors: {
          SiteNotFoundError: () => ({ status: 404, error: 'Site not found' }),
          SiteAccessDeniedError: () => ({
            status: 403,
            error: 'Access denied',
          }),
          DuplicateSiteNameError: () => ({
            status: 409,
            error: 'A site with this name already exists',
          }),
          SiteValidationError: (e) => ({ status: 400, error: e.message }),
        },
        fallbackMessage: 'Failed to update site',
      })
    }
  )
}
