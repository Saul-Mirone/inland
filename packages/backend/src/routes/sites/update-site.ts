import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as SiteService from '../../services/site'
import { createAppRuntime } from '../../utils/effect-runtime'

export const updateSiteRoute = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

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

      return runtime.runPromise(
        updateSite.pipe(
          Effect.catchTags({
            SiteNotFoundError: () =>
              Effect.sync(() =>
                reply.code(404).send({ error: 'Site not found' })
              ),
            SiteAccessDeniedError: () =>
              Effect.sync(() =>
                reply.code(403).send({ error: 'Access denied' })
              ),
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
          }),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply.code(500).send({ error: 'Failed to update site' })
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
