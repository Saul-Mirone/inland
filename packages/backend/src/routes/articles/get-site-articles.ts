import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'

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

      return fastify.runtime.runPromise(
        getSiteArticles.pipe(
          Effect.catchTag('SiteAccessError', () =>
            Effect.sync(() =>
              reply.code(403).send({
                error: 'You do not have access to this site',
              })
            )
          ),
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
