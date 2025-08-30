import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../plugins/schema-validation'
import * as Schemas from '../schemas'
import * as SiteService from '../services/site'
import { createAppRuntime } from '../utils/effect-runtime'

export const siteRoutes = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  // Create a new site
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
        // Validate input data
        const validName = yield* SiteService.validateSiteName(name)

        // Create the site with GitHub integration
        const site = yield* SiteService.createSite({
          userId: userPayload.userId,
          name: validName,
          description,
          author,
        })

        return { site }
      })

      return runtime.runPromise(
        createSite.pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)

                // Type-safe error handling using _tag
                if (
                  typeof error === 'object' &&
                  error !== null &&
                  '_tag' in error
                ) {
                  switch (error._tag) {
                    case 'SiteAccessError':
                      return reply.code(403).send({
                        error: 'Access denied to site',
                      })
                    case 'AuthTokenError':
                      return reply.code(401).send({
                        error:
                          'Your connection has expired. Please reconnect your account.',
                      })
                    case 'DuplicateSiteNameError':
                      return reply.code(409).send({
                        error: 'A site with this name already exists',
                      })
                    case 'SiteCreationError':
                      return reply.code(500).send({
                        error: 'Failed to create site',
                      })
                  }
                }

                // Fallback for non-tagged errors (validation errors)
                if (error instanceof Error) {
                  if (error.message.includes('Site name')) {
                    return reply.code(400).send({ error: error.message })
                  }
                }

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

  // Get all sites for the current user
  fastify.get(
    '/sites',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserSites = Effect.gen(function* () {
        const sites = yield* SiteService.findUserSites(userPayload.userId)
        return { sites }
      })

      return runtime.runPromise(
        getUserSites.pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply.code(500).send({ error: 'Failed to fetch sites' })
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

  // Get a specific site by ID
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

        // Check if user has access to this site
        if (site.userId !== userPayload.userId) {
          return yield* new SiteService.SiteAccessDeniedError({
            siteId: id,
            userId: userPayload.userId,
          })
        }

        return { site }
      })

      return runtime.runPromise(
        getSite.pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)

                // Type-safe error handling using _tag
                if (
                  typeof error === 'object' &&
                  error !== null &&
                  '_tag' in error
                ) {
                  switch (error._tag) {
                    case 'SiteNotFoundError':
                      return reply.code(404).send({ error: 'Site not found' })
                    case 'SiteAccessDeniedError':
                      return reply.code(403).send({ error: 'Access denied' })
                  }
                }

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

  // Update a site
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
        // Validate updated data if provided
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

        // Update the site
        const site = yield* SiteService.updateSite(
          id,
          userPayload.userId,
          validatedData
        )

        return { site }
      })

      return runtime.runPromise(
        updateSite.pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)

                // Type-safe error handling using _tag
                if (
                  typeof error === 'object' &&
                  error !== null &&
                  '_tag' in error
                ) {
                  switch (error._tag) {
                    case 'SiteNotFoundError':
                      return reply.code(404).send({ error: 'Site not found' })
                    case 'SiteAccessDeniedError':
                      return reply.code(403).send({ error: 'Access denied' })
                    case 'DuplicateSiteNameError':
                      return reply.code(409).send({
                        error: 'A site with this name already exists',
                      })
                  }
                }

                // Fallback for non-tagged errors (validation errors)
                if (error instanceof Error) {
                  if (
                    error.message.includes('Site name') ||
                    error.message.includes('Git repository')
                  ) {
                    return reply.code(400).send({ error: error.message })
                  }
                }

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

  // Delete a site
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
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)

                // Type-safe error handling using _tag
                if (
                  typeof error === 'object' &&
                  error !== null &&
                  '_tag' in error
                ) {
                  switch (error._tag) {
                    case 'SiteNotFoundError':
                      return reply.code(404).send({ error: 'Site not found' })
                    case 'SiteAccessDeniedError':
                      return reply.code(403).send({ error: 'Access denied' })
                  }
                }

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
