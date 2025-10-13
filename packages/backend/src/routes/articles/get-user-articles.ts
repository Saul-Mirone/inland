import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import * as ArticleService from '../../services/article'
import { createAppRuntime } from '../../utils/effect-runtime'

export const getUserArticlesRoute = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  fastify.get(
    '/articles',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserArticles = Effect.gen(function* () {
        const articles = yield* ArticleService.findUserArticles(
          userPayload.userId
        )
        return { articles }
      })

      return runtime.runPromise(
        getUserArticles.pipe(
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply
                  .code(500)
                  .send({ error: 'Failed to fetch articles' })
              }),
            onSuccess: (result) =>
              Effect.sync(() => {
                return reply.send(result)
              }),
          })
        )
      )
    }
  )
}
