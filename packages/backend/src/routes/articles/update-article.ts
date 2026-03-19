import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { ArticleService } from '../../services/article'
import { httpError, runRouteEffect } from '../../utils/route-effect'

export const updateArticleRoute = async (fastify: FastifyInstance) => {
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
        const articleService = yield* ArticleService

        const validatedData: {
          title?: string
          slug?: string
          content?: string
          status?: 'draft' | 'published'
        } = {}

        if (updateData.title) {
          validatedData.title = yield* articleService.validateTitle(
            updateData.title
          )
        }

        if (updateData.slug) {
          validatedData.slug = yield* articleService.validateSlug(
            updateData.slug
          )
        }

        if (updateData.content !== undefined) {
          validatedData.content = updateData.content
        }

        if (updateData.status) {
          validatedData.status = updateData.status
        }

        const article = yield* articleService.updateArticle(
          id,
          userPayload.userId,
          validatedData
        )

        return { article }
      })

      return runRouteEffect(
        fastify,
        reply,
        updateArticle.pipe(
          Effect.catchTags({
            ArticleNotFoundError: () => httpError(404, 'Article not found'),
            ArticleAccessDeniedError: () => httpError(403, 'Access denied'),
            DuplicateSlugError: () =>
              httpError(
                409,
                'An article with this slug already exists in this site'
              ),
            ArticleValidationError: (e) => httpError(400, e.message),
          })
        ),
        { fallbackMessage: 'Failed to update article' }
      )
    }
  )
}
