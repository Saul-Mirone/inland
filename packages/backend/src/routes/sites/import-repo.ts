import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'
import { createAppRuntime } from '../../utils/effect-runtime'

export const importRepoRoute = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  fastify.post(
    '/sites/import',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          body: Schemas.ImportRepoData,
        }),
      ],
    },
    async (request: TypedFastifyRequest<Schemas.ImportRepoData>, reply) => {
      const userPayload = request.jwtPayload!
      const {
        name,
        gitRepoFullName,
        platform,
        setupWorkflow,
        enablePages,
        overrideExistingFiles,
        description,
      } = request.validatedBody!

      const importRepoEffect = Effect.gen(function* () {
        const validName = yield* SiteService.validateSiteName(name)

        const result = yield* SiteService.importRepo({
          userId: userPayload.userId,
          name: validName,
          gitRepoFullName,
          platform,
          setupWorkflow,
          enablePages,
          overrideExistingFiles,
          description,
        })

        return result
      })

      return runtime.runPromise(
        importRepoEffect.pipe(
          Effect.tap((result) =>
            Effect.sync(() => reply.code(201).send(result))
          ),
          Effect.catchTags({
            DuplicateSiteNameError: () =>
              Effect.sync(() =>
                reply.code(409).send({
                  error: 'A site with this name already exists',
                })
              ),
            SiteValidationError: (error) =>
              Effect.sync(() =>
                reply.code(400).send({
                  error: error.message,
                })
              ),
            AuthTokenError: () =>
              Effect.sync(() =>
                reply.code(401).send({
                  error:
                    'Your connection has expired. Please reconnect your account.',
                })
              ),
            GitProviderError: (error) =>
              Effect.sync(() =>
                reply.code(404).send({
                  error: `Repository not found or access denied: ${error.message}`,
                })
              ),
          }),
          Effect.catchAll((error) =>
            Effect.sync(() => {
              fastify.log.error(error)
              return reply
                .code(500)
                .send({ error: 'Failed to import repository' })
            })
          )
        )
      )
    }
  )
}
