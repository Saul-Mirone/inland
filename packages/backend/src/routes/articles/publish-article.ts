import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'

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
        const result = yield* ArticleService.publishArticleToGit(
          id,
          userPayload.userId
        )
        return {
          message: 'Article published successfully',
          ...result,
        }
      })

      return fastify.runtime.runPromise(
        publishArticle.pipe(
          Effect.catchTags({
            ArticleNotFoundError: () =>
              Effect.sync(() =>
                reply.code(404).send({ error: 'Article not found' })
              ),
            ArticleAccessDeniedError: () =>
              Effect.sync(() =>
                reply.code(403).send({ error: 'Access denied' })
              ),
            AuthTokenError: () =>
              Effect.sync(() =>
                reply.code(401).send({
                  error:
                    'Authentication token is invalid. Please reconnect your account.',
                })
              ),
          }),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply
                  .code(500)
                  .send({ error: 'Failed to publish article' })
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
