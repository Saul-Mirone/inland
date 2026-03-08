import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'
import { runRouteEffect } from '../../utils/route-effect'

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

      return runRouteEffect(fastify, reply, {
        effect: importRepoEffect,
        errors: {
          DuplicateSiteNameError: () => ({
            status: 409,
            error: 'A site with this name already exists',
          }),
          SiteValidationError: (e) => ({ status: 400, error: e.message }),
          AuthTokenError: () => ({
            status: 401,
            error:
              'Your connection has expired. Please reconnect your account.',
          }),
          GitProviderError: (e) => ({
            status: 404,
            error: `Repository not found or access denied: ${e.message}`,
          }),
        },
        fallbackMessage: 'Failed to import repository',
        successCode: 201,
      })
    }
  )
}
