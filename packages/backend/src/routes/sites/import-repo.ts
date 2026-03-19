import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { SiteService } from '../../services/site'
import { httpError, runRouteEffect } from '../../utils/route-effect'

export const importRepoRoute = async (fastify: FastifyInstance) => {
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
        const siteService = yield* SiteService

        const validName = yield* siteService.validateSiteName(name)

        const result = yield* siteService.importRepo({
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

      return runRouteEffect(
        fastify,
        reply,
        importRepoEffect.pipe(
          Effect.catchTags({
            DuplicateSiteNameError: () =>
              httpError(409, 'A site with this name already exists'),
            SiteCreationError: (e) => httpError(500, e.reason),
            SiteValidationError: (e) => httpError(400, e.message),
            AuthTokenError: () =>
              httpError(
                401,
                'Your connection has expired. Please reconnect your account.'
              ),
            GitProviderError: (e) =>
              httpError(
                404,
                `Repository not found or access denied: ${e.message}`
              ),
          })
        ),
        {
          fallbackMessage: 'Failed to import repository',
          successCode: 201,
        }
      )
    }
  )
}
