import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'

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
        const site = yield* SiteService.findSiteById(id)

        if (site.userId !== userPayload.userId) {
          return yield* new SiteService.SiteAccessDeniedError({
            siteId: id,
            userId: userPayload.userId,
          })
        }

        return { site }
      })

      return fastify.runtime.runPromise(
        getSite.pipe(
          Effect.catchTags({
            SiteNotFoundError: () =>
              Effect.sync(() =>
                reply.code(404).send({ error: 'Site not found' })
              ),
            SiteAccessDeniedError: () =>
              Effect.sync(() =>
                reply.code(403).send({ error: 'Access denied' })
              ),
          }),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply.code(500).send({ error: 'Failed to fetch site' })
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
