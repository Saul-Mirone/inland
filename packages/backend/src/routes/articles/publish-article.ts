import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { ArticleService } from '../../services/article'
import { httpError, runRouteEffect } from '../../utils/route-effect'

export const publishArticleRoute = async (fastify: FastifyInstance) => {
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
        const articleService = yield* ArticleService
        const result = yield* articleService.publishArticleToGit(
          id,
          userPayload.userId
        )
        return {
          message: 'Article published successfully',
          ...result,
        }
      })

      return runRouteEffect(
        fastify,
        reply,
        publishArticle.pipe(
          Effect.catchTags({
            ArticleNotFoundError: () => httpError(404, 'Article not found'),
            ArticleAccessDeniedError: () => httpError(403, 'Access denied'),
            AuthTokenError: () =>
              httpError(
                401,
                'Authentication token is invalid. Please reconnect your account.'
              ),
          })
        ),
        { fallbackMessage: 'Failed to publish article' }
      )
    }
  )
}
