import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { ArticleService } from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

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

      return runRouteEffect(fastify, reply, {
        effect: publishArticle,
        errors: {
          ArticleNotFoundError: () => ({
            status: 404,
            error: 'Article not found',
          }),
          ArticleAccessDeniedError: () => ({
            status: 403,
            error: 'Access denied',
          }),
          AuthTokenError: () => ({
            status: 401,
            error:
              'Authentication token is invalid. Please reconnect your account.',
          }),
        },
        fallbackMessage: 'Failed to publish article',
      })
    }
  )
}
