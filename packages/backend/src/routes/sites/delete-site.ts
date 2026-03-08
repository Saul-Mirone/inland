import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'
import { runRouteEffect } from '../../utils/route-effect'

export const deleteSiteRoute = async (fastify: FastifyInstance) => {
  fastify.delete(
    '/sites/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteParam,
        }),
      ],
    },
    async (request: TypedFastifyRequest<unknown, Schemas.SiteParam>, reply) => {
      const userPayload = request.jwtPayload!
      const { id } = request.validatedParams!

      const deleteSite = Effect.gen(function* () {
        const site = yield* SiteService.deleteSite(id, userPayload.userId)
        return { message: 'Site deleted successfully', site }
      })

      return runRouteEffect(fastify, reply, {
        effect: deleteSite,
        errors: {
          SiteNotFoundError: () => ({ status: 404, error: 'Site not found' }),
          SiteAccessDeniedError: () => ({
            status: 403,
            error: 'Access denied',
          }),
        },
        fallbackMessage: 'Failed to delete site',
      })
    }
  )
}
