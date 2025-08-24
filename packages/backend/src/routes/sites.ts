import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import * as SiteService from '../services/site'
import { createAppRuntime } from '../utils/effect-runtime'

export const siteRoutes = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  // Create a new site
  fastify.post(
    '/sites',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { name, description, author } = request.body as {
          name: string
          description?: string
          author?: string
        }

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

        const result = await runtime.runPromise(createSite)
        return reply.code(201).send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          // Handle validation errors
          if (error.message.includes('Site name')) {
            return reply.code(400).send({ error: error.message })
          }

          // Handle GitHub API errors
          if (error.message.includes('GitHubAPIError')) {
            return reply.code(502).send({
              error:
                'GitHub API error. Please check your access token and try again.',
            })
          }

          // Handle repository creation errors
          if (error.message.includes('RepositoryCreationError')) {
            return reply.code(400).send({
              error:
                'Failed to create GitHub repository. Repository name might already exist.',
            })
          }

          // Handle GitHub Pages deployment errors
          if (error.message.includes('PagesDeploymentError')) {
            return reply.code(502).send({
              error:
                'Repository created but GitHub Pages setup failed. You can enable it manually.',
            })
          }

          // Handle missing GitHub integration
          if (error.message.includes('No GitHub integration found')) {
            return reply.code(400).send({
              error:
                'No GitHub account connected. Please connect your GitHub account first.',
            })
          }

          // Handle invalid GitHub token
          if (error.message.includes('GitHub token is invalid')) {
            return reply.code(401).send({
              error:
                'Your GitHub connection has expired. Please reconnect your GitHub account.',
            })
          }

          // Handle duplicate site name
          if (error.message.includes('DuplicateSiteNameError')) {
            return reply
              .code(409)
              .send({ error: 'A site with this name already exists' })
          }
        }

        return reply.code(500).send({ error: 'Failed to create site' })
      }
    }
  )

  // Get all sites for the current user
  fastify.get(
    '/sites',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!

        const getUserSites = Effect.gen(function* () {
          const sites = yield* SiteService.findUserSites(userPayload.userId)
          return { sites }
        })

        const result = await runtime.runPromise(getUserSites)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Failed to fetch sites' })
      }
    }
  )

  // Get a specific site by ID
  fastify.get(
    '/sites/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { id } = request.params as { id: string }

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

        const result = await runtime.runPromise(getSite)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          if (error.message.includes('SiteNotFoundError')) {
            return reply.code(404).send({ error: 'Site not found' })
          }

          if (error.message.includes('SiteAccessDeniedError')) {
            return reply.code(403).send({ error: 'Access denied' })
          }
        }

        return reply.code(500).send({ error: 'Failed to fetch site' })
      }
    }
  )

  // Update a site
  fastify.put(
    '/sites/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { id } = request.params as { id: string }
        const updateData = request.body as {
          name?: string
          gitRepo?: string
          platform?: string
          deployStatus?: string
        }

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

        const result = await runtime.runPromise(updateSite)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          if (error.message.includes('SiteNotFoundError')) {
            return reply.code(404).send({ error: 'Site not found' })
          }

          if (error.message.includes('SiteAccessDeniedError')) {
            return reply.code(403).send({ error: 'Access denied' })
          }

          if (error.message.includes('DuplicateSiteNameError')) {
            return reply
              .code(409)
              .send({ error: 'A site with this name already exists' })
          }

          if (
            error.message.includes('Site name') ||
            error.message.includes('Git repository')
          ) {
            return reply.code(400).send({ error: error.message })
          }
        }

        return reply.code(500).send({ error: 'Failed to update site' })
      }
    }
  )

  // Delete a site
  fastify.delete(
    '/sites/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { id } = request.params as { id: string }

        const deleteSite = Effect.gen(function* () {
          const site = yield* SiteService.deleteSite(id, userPayload.userId)
          return { message: 'Site deleted successfully', site }
        })

        const result = await runtime.runPromise(deleteSite)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          if (error.message.includes('SiteNotFoundError')) {
            return reply.code(404).send({ error: 'Site not found' })
          }

          if (error.message.includes('SiteAccessDeniedError')) {
            return reply.code(403).send({ error: 'Access denied' })
          }
        }

        return reply.code(500).send({ error: 'Failed to delete site' })
      }
    }
  )
}
