import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { ArticleService } from '../../services/article'
import { httpError, runRouteEffect } from '../../utils/route-effect'

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
        const articleService = yield* ArticleService
        const article = yield* articleService.deleteArticle(
          id,
          userPayload.userId
        )
        return { message: 'Article deleted successfully', article }
      })

      return runRouteEffect(
        fastify,
        reply,
        deleteArticle.pipe(
          Effect.catchTags({
            ArticleNotFoundError: () => httpError(404, 'Article not found'),
            ArticleAccessDeniedError: () => httpError(403, 'Access denied'),
          })
        ),
        { fallbackMessage: 'Failed to delete article' }
      )
    }
  )
}
