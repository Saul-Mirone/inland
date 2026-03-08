import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

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

      return runRouteEffect(fastify, reply, {
        effect: updateArticle,
        errors: {
          ArticleNotFoundError: () => ({
            status: 404,
            error: 'Article not found',
          }),
          ArticleAccessDeniedError: () => ({
            status: 403,
            error: 'Access denied',
          }),
          DuplicateSlugError: () => ({
            status: 409,
            error: 'An article with this slug already exists in this site',
          }),
          ArticleValidationError: (e) => ({ status: 400, error: e.message }),
        },
        fallbackMessage: 'Failed to update article',
      })
    }
  )
}
