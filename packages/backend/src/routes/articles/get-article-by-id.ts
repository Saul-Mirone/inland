import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { ArticleService } from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

export const getArticleByIdRoute = async (fastify: FastifyInstance) => {
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
        const articleService = yield* ArticleService
        const article = yield* articleService.findArticleById(
          id,
          userPayload.userId
        )
        return { article }
      })

      return runRouteEffect(fastify, reply, {
        effect: getArticle,
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
        fallbackMessage: 'Failed to fetch article',
      })
    }
  )
}
