import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'

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

      return fastify.runtime.runPromise(
        deleteSite.pipe(
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
                return reply.code(500).send({ error: 'Failed to delete site' })
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
