import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

export const getSiteArticlesRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/sites/:siteId/articles',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteIdParam,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, Schemas.SiteIdParam>,
      reply
    ) => {
      const userPayload = request.jwtPayload!
      const { siteId } = request.validatedParams!

      const getSiteArticles = Effect.gen(function* () {
        const articles = yield* ArticleService.findSiteArticles(
          siteId,
          userPayload.userId
        )
        return { articles }
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
