import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import * as ArticleService from '../services/article-service'
import { createAppRuntime } from '../utils/effect-runtime'

export const articleRoutes = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  // Create a new article
  fastify.post(
    '/articles',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { siteId, title, slug, content, status } = request.body as {
          siteId: string
          title: string
          slug?: string
          content: string
          status?: 'draft' | 'published'
        }

        const createArticle = Effect.gen(function* () {
          // Validate input data
          const validTitle = yield* ArticleService.validateTitle(title)

          // Generate slug if not provided
          const validSlug = slug
            ? yield* ArticleService.validateSlug(slug)
            : yield* ArticleService.generateSlugFromTitle(validTitle)

          // Create the article
          const article = yield* ArticleService.createArticle(
            userPayload.userId,
            {
              siteId,
              title: validTitle,
              slug: validSlug,
              content,
              status,
            }
          )

          return { article }
        })

        const result = await runtime.runPromise(createArticle)
        return reply.code(201).send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          // Handle validation errors
          if (
            error.message.includes('title') ||
            error.message.includes('slug')
          ) {
            return reply.code(400).send({ error: error.message })
          }

          // Handle duplicate slug
          if (error.message.includes('DuplicateSlugError')) {
            return reply.code(409).send({
              error: 'An article with this slug already exists in this site',
            })
          }

          // Handle site access errors
          if (error.message.includes('SiteAccessError')) {
            return reply
              .code(403)
              .send({ error: 'You do not have access to this site' })
          }
        }

        return reply.code(500).send({ error: 'Failed to create article' })
      }
    }
  )

  // Get all articles for a specific site
  fastify.get(
    '/sites/:siteId/articles',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { siteId } = request.params as { siteId: string }

        const getSiteArticles = Effect.gen(function* () {
          const articles = yield* ArticleService.findSiteArticles(
            siteId,
            userPayload.userId
          )
          return { articles }
        })

        const result = await runtime.runPromise(getSiteArticles)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (
          error instanceof Error &&
          error.message.includes('SiteAccessError')
        ) {
          return reply
            .code(403)
            .send({ error: 'You do not have access to this site' })
        }

        return reply.code(500).send({ error: 'Failed to fetch articles' })
      }
    }
  )

  // Get all articles for the current user (across all sites)
  fastify.get(
    '/articles',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!

        const getUserArticles = Effect.gen(function* () {
          const articles = yield* ArticleService.findUserArticles(
            userPayload.userId
          )
          return { articles }
        })

        const result = await runtime.runPromise(getUserArticles)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)
        return reply.code(500).send({ error: 'Failed to fetch articles' })
      }
    }
  )

  // Get a specific article by ID
  fastify.get(
    '/articles/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { id } = request.params as { id: string }

        const getArticle = Effect.gen(function* () {
          const article = yield* ArticleService.findArticleById(id)

          // Check if user has access to this article
          if (article.site.userId !== userPayload.userId) {
            return yield* new ArticleService.ArticleAccessDeniedError({
              articleId: id,
              userId: userPayload.userId,
            })
          }

          return { article }
        })

        const result = await runtime.runPromise(getArticle)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          if (error.message.includes('ArticleNotFoundError')) {
            return reply.code(404).send({ error: 'Article not found' })
          }

          if (error.message.includes('ArticleAccessDeniedError')) {
            return reply.code(403).send({ error: 'Access denied' })
          }
        }

        return reply.code(500).send({ error: 'Failed to fetch article' })
      }
    }
  )

  // Update an article
  fastify.put(
    '/articles/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { id } = request.params as { id: string }
        const updateData = request.body as {
          title?: string
          slug?: string
          content?: string
          status?: 'draft' | 'published'
        }

        const updateArticle = Effect.gen(function* () {
          // Validate updated data if provided
          const validatedData: {
            title?: string
            slug?: string
            content?: string
            status?: 'draft' | 'published'
          } = {}

          if (updateData.title) {
            validatedData.title = yield* ArticleService.validateTitle(
              updateData.title
            )
          }

          if (updateData.slug) {
            validatedData.slug = yield* ArticleService.validateSlug(
              updateData.slug
            )
          }

          if (updateData.content !== undefined) {
            validatedData.content = updateData.content
          }

          if (updateData.status) {
            validatedData.status = updateData.status
          }

          // Update the article
          const article = yield* ArticleService.updateArticle(
            id,
            userPayload.userId,
            validatedData
          )

          return { article }
        })

        const result = await runtime.runPromise(updateArticle)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          if (error.message.includes('ArticleNotFoundError')) {
            return reply.code(404).send({ error: 'Article not found' })
          }

          if (error.message.includes('ArticleAccessDeniedError')) {
            return reply.code(403).send({ error: 'Access denied' })
          }

          if (error.message.includes('DuplicateSlugError')) {
            return reply.code(409).send({
              error: 'An article with this slug already exists in this site',
            })
          }

          if (
            error.message.includes('title') ||
            error.message.includes('slug')
          ) {
            return reply.code(400).send({ error: error.message })
          }
        }

        return reply.code(500).send({ error: 'Failed to update article' })
      }
    }
  )

  // Delete an article
  fastify.delete(
    '/articles/:id',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { id } = request.params as { id: string }

        const deleteArticle = Effect.gen(function* () {
          const article = yield* ArticleService.deleteArticle(
            id,
            userPayload.userId
          )
          return { message: 'Article deleted successfully', article }
        })

        const result = await runtime.runPromise(deleteArticle)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          if (error.message.includes('ArticleNotFoundError')) {
            return reply.code(404).send({ error: 'Article not found' })
          }

          if (error.message.includes('ArticleAccessDeniedError')) {
            return reply.code(403).send({ error: 'Access denied' })
          }
        }

        return reply.code(500).send({ error: 'Failed to delete article' })
      }
    }
  )

  // Publish an article to GitHub
  fastify.post(
    '/articles/:id/publish',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const userPayload = request.jwtPayload!
        const { id } = request.params as { id: string }

        const publishArticle = Effect.gen(function* () {
          const result = yield* ArticleService.publishArticleToGitHub(
            id,
            userPayload.userId
          )
          return {
            message: 'Article published successfully',
            ...result,
          }
        })

        const result = await runtime.runPromise(publishArticle)
        return reply.send(result)
      } catch (error) {
        fastify.log.error(error)

        if (error instanceof Error) {
          if (error.message.includes('ArticleNotFoundError')) {
            return reply.code(404).send({ error: 'Article not found' })
          }

          if (error.message.includes('ArticleAccessDeniedError')) {
            return reply.code(403).send({ error: 'Access denied' })
          }

          if (error.message.includes('SiteAccessError')) {
            return reply
              .code(403)
              .send({ error: 'You do not have access to this site' })
          }

          if (error.message.includes('GitHubAPIError')) {
            return reply.code(502).send({
              error: 'Failed to publish to GitHub: ' + error.message,
            })
          }
        }

        return reply.code(500).send({ error: 'Failed to publish article' })
      }
    }
  )
}
