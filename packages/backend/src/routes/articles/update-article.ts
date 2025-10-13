import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'
import { createAppRuntime } from '../../utils/effect-runtime'

export const updateArticleRoute = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

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

        const article = yield* ArticleService.updateArticle(
          id,
          userPayload.userId,
          validatedData
        )

        return { article }
      })

      return runtime.runPromise(
        updateArticle.pipe(
          Effect.catchTags({
            ArticleNotFoundError: () =>
              Effect.sync(() =>
                reply.code(404).send({ error: 'Article not found' })
              ),
            ArticleAccessDeniedError: () =>
              Effect.sync(() =>
                reply.code(403).send({ error: 'Access denied' })
              ),
            DuplicateSlugError: () =>
              Effect.sync(() =>
                reply.code(409).send({
                  error:
                    'An article with this slug already exists in this site',
                })
              ),
            ArticleValidationError: (error) =>
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
}
