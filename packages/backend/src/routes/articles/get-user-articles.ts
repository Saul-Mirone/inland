import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { ArticleService } from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

export const getUserArticlesRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/articles',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          querystring: Schemas.PaginationParams,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, unknown, Schemas.PaginationParams>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { page, limit } = request.validatedQuery!

      const getUserArticles = Effect.gen(function* () {
        const articleService = yield* ArticleService
        const result = yield* articleService.findUserArticles(
          userPayload.userId,
          { page, limit }
        )
        return {
          articles: result.items,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
          },
        }
      })

      return runRouteEffect(fastify, reply, {
        effect: getUserArticles,
        fallbackMessage: 'Failed to fetch articles',
      })
    }
  )
}
