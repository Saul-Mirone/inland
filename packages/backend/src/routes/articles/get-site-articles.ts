import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import { ArticleService } from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

export const getSiteArticlesRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/sites/:siteId/articles',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteIdParam,
          querystring: Schemas.PaginationParams,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<
        unknown,
        Schemas.SiteIdParam,
        Schemas.PaginationParams
      >,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { siteId } = request.validatedParams!
      const { page, limit } = request.validatedQuery!

      const getSiteArticles = Effect.gen(function* () {
        const articleService = yield* ArticleService
        const result = yield* articleService.findSiteArticles(
          siteId,
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
        effect: getSiteArticles,
        errors: {
          SiteAccessError: () => ({
            status: 403,
            error: 'You do not have access to this site',
          }),
        },
        fallbackMessage: 'Failed to fetch articles',
      })
    }
  )
}
