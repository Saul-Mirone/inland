import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../plugins/schema-validation'
import * as Schemas from '../schemas'
import * as ArticleService from '../services/article'
import { createAppRuntime } from '../utils/effect-runtime'

export const articleRoutes = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  // Create a new article
  fastify.post(
    '/articles',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          body: Schemas.CreateArticleData,
        }),
      ],
    },
    async (request: TypedFastifyRequest<Schemas.CreateArticleData>, reply) => {
      const userPayload = request.jwtPayload!
      const { siteId, title, slug, content, status } = request.validatedBody!

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

      return runtime.runPromise(
        createArticle.pipe(
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
                    case 'DuplicateSlugError':
                      return reply.code(409).send({
                        error:
                          'An article with this slug already exists in this site',
                      })
                    case 'SiteAccessError':
                      return reply.code(403).send({
                        error: 'You do not have access to this site',
                      })
                  }
                }

                // Fallback for non-tagged errors (validation errors)
                if (error instanceof Error) {
                  if (
                    error.message.includes('title') ||
                    error.message.includes('slug')
                  ) {
                    return reply.code(400).send({ error: error.message })
                  }
                }

                return reply
                  .code(500)
                  .send({ error: 'Failed to create article' })
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

  // Get all articles for a specific site
  fastify.get(
    '/sites/:siteId/articles',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteIdParam,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, Schemas.SiteIdParam>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { siteId } = request.validatedParams!

      const getSiteArticles = Effect.gen(function* () {
        const articles = yield* ArticleService.findSiteArticles(
          siteId,
          userPayload.userId
        )
        return { articles }
      })

      return runtime.runPromise(
        getSiteArticles.pipe(
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
                        error: 'You do not have access to this site',
                      })
                  }
                }

                return reply
                  .code(500)
                  .send({ error: 'Failed to fetch articles' })
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

  // Get all articles for the current user (across all sites)
  fastify.get(
    '/articles',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserArticles = Effect.gen(function* () {
        const articles = yield* ArticleService.findUserArticles(
          userPayload.userId
        )
        return { articles }
      })

      return runtime.runPromise(
        getUserArticles.pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply
                  .code(500)
                  .send({ error: 'Failed to fetch articles' })
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

  // Get a specific article by ID
  fastify.get(
    '/articles/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.ArticleIdParam,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, Schemas.ArticleIdParam>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { id } = request.validatedParams!

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

      return runtime.runPromise(
        getArticle.pipe(
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
                    case 'ArticleNotFoundError':
                      return reply
                        .code(404)
                        .send({ error: 'Article not found' })
                    case 'ArticleAccessDeniedError':
                      return reply.code(403).send({ error: 'Access denied' })
                  }
                }

                return reply
                  .code(500)
                  .send({ error: 'Failed to fetch article' })
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

  // Update an article
  fastify.put(
    '/articles/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.ArticleIdParam,
          body: Schemas.UpdateArticleData,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<
        Schemas.UpdateArticleData,
        Schemas.ArticleIdParam
      >,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { id } = request.validatedParams!
      const updateData = request.validatedBody!

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

      return runtime.runPromise(
        updateArticle.pipe(
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
                    case 'ArticleNotFoundError':
                      return reply
                        .code(404)
                        .send({ error: 'Article not found' })
                    case 'ArticleAccessDeniedError':
                      return reply.code(403).send({ error: 'Access denied' })
                    case 'DuplicateSlugError':
                      return reply.code(409).send({
                        error:
                          'An article with this slug already exists in this site',
                      })
                  }
                }

                // Fallback for non-tagged errors (validation errors)
                if (error instanceof Error) {
                  if (
                    error.message.includes('title') ||
                    error.message.includes('slug')
                  ) {
                    return reply.code(400).send({ error: error.message })
                  }
                }

                return reply
                  .code(500)
                  .send({ error: 'Failed to update article' })
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

  // Delete an article
  fastify.delete(
    '/articles/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.ArticleIdParam,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, Schemas.ArticleIdParam>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { id } = request.validatedParams!

      const deleteArticle = Effect.gen(function* () {
        const article = yield* ArticleService.deleteArticle(
          id,
          userPayload.userId
        )
        return { message: 'Article deleted successfully', article }
      })

      return runtime.runPromise(
        deleteArticle.pipe(
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
                    case 'ArticleNotFoundError':
                      return reply
                        .code(404)
                        .send({ error: 'Article not found' })
                    case 'ArticleAccessDeniedError':
                      return reply.code(403).send({ error: 'Access denied' })
                  }
                }

                return reply
                  .code(500)
                  .send({ error: 'Failed to delete article' })
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

  // Publish an article to Git
  fastify.post(
    '/articles/:id/publish',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.ArticleIdParam,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, Schemas.ArticleIdParam>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { id } = request.validatedParams!

      const publishArticle = Effect.gen(function* () {
        const result = yield* ArticleService.publishArticleToGit(
          id,
          userPayload.userId
        )
        return {
          message: 'Article published successfully',
          ...result,
        }
      })

      return runtime.runPromise(
        publishArticle.pipe(
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
                    case 'ArticleNotFoundError':
                      return reply
                        .code(404)
                        .send({ error: 'Article not found' })
                    case 'ArticleAccessDeniedError':
                      return reply.code(403).send({ error: 'Access denied' })
                    case 'AuthTokenError':
                      return reply.code(401).send({
                        error:
                          'Authentication token is invalid. Please reconnect your account.',
                      })
                  }
                }

                return reply
                  .code(500)
                  .send({ error: 'Failed to publish article' })
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
