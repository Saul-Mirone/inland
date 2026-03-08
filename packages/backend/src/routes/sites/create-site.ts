import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'

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
        const validName = yield* SiteService.validateSiteName(name)

        const site = yield* SiteService.createSite({
          userId: userPayload.userId,
          name: validName,
          description,
          author,
        })

        return { site }
      })

      return fastify.runtime.runPromise(
        createSite.pipe(
          Effect.catchTags({
            AuthTokenError: () =>
              Effect.sync(() =>
                reply.code(401).send({
                  error:
                    'Your connection has expired. Please reconnect your account.',
                })
              ),
            DuplicateSiteNameError: () =>
              Effect.sync(() =>
                reply.code(409).send({
                  error: 'A site with this name already exists',
                })
              ),
            SiteCreationError: () =>
              Effect.sync(() =>
                reply.code(500).send({
                  error: 'Failed to create site',
                })
              ),
            SiteValidationError: (error) =>
              Effect.sync(() =>
                reply.code(400).send({
                  error: error.message,
                })
              ),
          }),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply.code(500).send({ error: 'Failed to create site' })
              }),
            onSuccess: (result) =>
              Effect.sync(() => {
                return reply.code(201).send(result)
              }),
          })
        )
      )
    }
  )
}
