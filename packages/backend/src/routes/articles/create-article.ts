import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as ArticleService from '../../services/article'

export const createArticleRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/articles',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          body: Schemas.CreateArticleData,
        }),
      ],
    },
    async (request: TypedFastifyRequest<Schemas.CreateArticleData>, reply) => {
      const userPayload = request.jwtPayload!
      const { siteId, title, slug, content, status } = request.validatedBody!

      const createArticle = Effect.gen(function* () {
        const validTitle = yield* ArticleService.validateTitle(title)

        const validSlug = slug
          ? yield* ArticleService.validateSlug(slug)
          : yield* ArticleService.generateSlugFromTitle(validTitle)

        const article = yield* ArticleService.createArticle(
          userPayload.userId,
          {
            siteId,
            title: validTitle,
            slug: validSlug,
            content,
            status,
          }
        )

        return { article }
      })

      return fastify.runtime.runPromise(
        createArticle.pipe(
          Effect.catchTags({
            DuplicateSlugError: () =>
              Effect.sync(() =>
                reply.code(409).send({
                  error:
                    'An article with this slug already exists in this site',
                })
              ),
            SiteAccessError: () =>
              Effect.sync(() =>
                reply.code(403).send({
                  error: 'You do not have access to this site',
                })
              ),
            ArticleCreationError: (error) =>
              Effect.sync(() =>
                reply.code(500).send({
                  error: `Failed to create article: ${error.reason}`,
                })
              ),
            ArticleValidationError: (error) =>
              Effect.sync(() =>
                reply.code(400).send({
                  error: error.message,
                })
              ),
          }),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply
                  .code(500)
                  .send({ error: 'Failed to create article' })
              }),
            onSuccess: (result) =>
              Effect.sync(() => {
                return reply.code(201).send(result)
              }),
          })
        )
      )
    }
  )
}
