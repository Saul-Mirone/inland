import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'
import { createAppRuntime } from '../../utils/effect-runtime'

export const deleteSiteRoute = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

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

      return runtime.runPromise(
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
