import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { ArticleService } from '../../services/article';
import { httpError, runRouteEffect } from '../../utils/route-effect';

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
      const userPayload = request.jwtPayload!;
      const {
        siteId,
        title,
        slug,
        content,
        excerpt,
        tags,
        status,
        publishedAt,
      } = request.validatedBody!;

      const createArticle = Effect.gen(function* () {
        const articleService = yield* ArticleService;

        const validTitle = yield* articleService.validateTitle(title);

        const validSlug = slug
          ? yield* articleService.validateSlug(slug)
          : yield* articleService.generateSlugFromTitle(validTitle);

        const article = yield* articleService.createArticle(
          userPayload.userId,
          {
            siteId,
            title: validTitle,
            slug: validSlug,
            content,
            excerpt,
            tags,
            status,
            publishedAt,
          }
        );

        return { article };
      });

      return runRouteEffect(
        fastify,
        reply,
        createArticle.pipe(
          Effect.catchTags({
            DuplicateSlugError: () =>
              httpError(
                409,
                'An article with this slug already exists in this site'
              ),
            SiteAccessDeniedError: () =>
              httpError(403, 'You do not have access to this site'),
            ArticleCreationError: (e) =>
              httpError(500, `Failed to create article: ${e.reason}`),
            ArticleValidationError: (e) => httpError(400, e.message),
          })
        ),
        {
          fallbackMessage: 'Failed to create article',
          successCode: 201,
        }
      );
    }
  );
};
