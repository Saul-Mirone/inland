import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { ArticleService } from '../../services/article';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const syncArticlesRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/sites/:id/sync',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({ params: Schemas.SiteParam }),
      ],
    },
    async (request: TypedFastifyRequest<unknown, Schemas.SiteParam>, reply) => {
      const userPayload = request.jwtPayload!;
      const { id } = request.validatedParams!;

      const syncEffect = Effect.gen(function* () {
        const articleService = yield* ArticleService;
        return yield* articleService.syncArticlesFromGit(
          id,
          userPayload.userId
        );
      });

      return runRouteEffect(
        fastify,
        reply,
        syncEffect.pipe(
          Effect.catchTags({
            SiteAccessDeniedError: () => httpError(403, 'Access denied'),
            GitRepositoryError: (e) => httpError(400, e.message),
            AuthTokenError: () =>
              httpError(
                401,
                'Authentication token is invalid. Please reconnect your account.'
              ),
            GitProviderError: (e) =>
              httpError(502, `Git provider error: ${e.message}`),
          })
        ),
        { fallbackMessage: 'Failed to sync articles' }
      );
    }
  );
};
