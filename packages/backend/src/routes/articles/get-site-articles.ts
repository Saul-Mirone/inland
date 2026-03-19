import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { ArticleService } from '../../services/article';
import { toPaginatedResponse } from '../../utils/pagination-response';
import { httpError, runRouteEffect } from '../../utils/route-effect';

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
      const userPayload = request.jwtPayload!;
      const { siteId } = request.validatedParams!;
      const { page, limit } = request.validatedQuery!;

      const getSiteArticles = Effect.gen(function* () {
        const articleService = yield* ArticleService;
        const result = yield* articleService.findSiteArticles(
          siteId,
          userPayload.userId,
          { page, limit }
        );
        return toPaginatedResponse('articles', result);
      });

      return runRouteEffect(
        fastify,
        reply,
        getSiteArticles.pipe(
          Effect.catchTags({
            SiteAccessDeniedError: () =>
              httpError(403, 'You do not have access to this site'),
          })
        ),
        { fallbackMessage: 'Failed to fetch articles' }
      );
    }
  );
};
