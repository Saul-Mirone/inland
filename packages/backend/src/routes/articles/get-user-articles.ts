import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import { ArticleService } from '../../services/article'
import { runRouteEffect } from '../../utils/route-effect'

export const getUserArticlesRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/articles',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserArticles = Effect.gen(function* () {
        const articleService = yield* ArticleService
        const articles = yield* articleService.findUserArticles(
          userPayload.userId
        )
        return { articles }
      })

      return runRouteEffect(fastify, reply, {
        effect: getUserArticles,
        fallbackMessage: 'Failed to fetch articles',
      })
    }
  )
}
