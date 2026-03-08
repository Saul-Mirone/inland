import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'
import { runRouteEffect } from '../../utils/route-effect'

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

      const getSite = SiteService.findSiteById(id, userPayload.userId).pipe(
        Effect.map((site) => ({ site }))
      )

      return runRouteEffect(fastify, reply, {
        effect: getSite,
        errors: {
          SiteNotFoundError: () => ({ status: 404, error: 'Site not found' }),
          SiteAccessDeniedError: () => ({
            status: 403,
            error: 'Access denied',
          }),
        },
        fallbackMessage: 'Failed to fetch site',
      })
    }
  )
}
