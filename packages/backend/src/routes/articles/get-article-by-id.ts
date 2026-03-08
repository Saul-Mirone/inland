import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'

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
        const article = yield* ArticleService.findArticleById(id)

        if (article.site.userId !== userPayload.userId) {
          return yield* new ArticleService.ArticleAccessDeniedError({
            articleId: id,
            userId: userPayload.userId,
          })
        }

        return { article }
      })

      return fastify.runtime.runPromise(
        getArticle.pipe(
          Effect.catchTags({
            ArticleNotFoundError: () =>
              Effect.sync(() =>
                reply.code(404).send({ error: 'Article not found' })
              ),
            ArticleAccessDeniedError: () =>
              Effect.sync(() =>
                reply.code(403).send({ error: 'Access denied' })
              ),
          }),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply
                  .code(500)
                  .send({ error: 'Failed to fetch article' })
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
