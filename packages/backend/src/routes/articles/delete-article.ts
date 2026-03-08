import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

export const deleteArticleRoute = async (fastify: FastifyInstance) => {
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

      return runRouteEffect(fastify, reply, {
        effect: deleteArticle,
        errors: {
          ArticleNotFoundError: () => ({
            status: 404,
            error: 'Article not found',
          }),
          ArticleAccessDeniedError: () => ({
            status: 403,
            error: 'Access denied',
          }),
        },
        fallbackMessage: 'Failed to delete article',
      })
    }
  )
}
