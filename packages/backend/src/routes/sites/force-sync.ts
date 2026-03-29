import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { SiteService } from '../../services/site';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const forceSyncRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/sites/:id/force-sync',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({ params: Schemas.SiteParam }),
      ],
    },
    async (request: TypedFastifyRequest<unknown, Schemas.SiteParam>, reply) => {
      const userPayload = request.jwtPayload!;
      const { id } = request.validatedParams!;

      const forceSyncEffect = Effect.gen(function* () {
        const siteService = yield* SiteService;
        return yield* siteService.forceSyncSite(id, userPayload.userId);
      });

      return runRouteEffect(
        fastify,
        reply,
        forceSyncEffect.pipe(
          Effect.catchTags({
            SiteAccessDeniedError: () => httpError(403, 'Access denied'),
            SiteNotFoundError: () => httpError(404, 'Site not found'),
            GitRepositoryError: (e) => httpError(400, e.message),
            RepositoryCreationError: (e) =>
              httpError(502, `Failed to recreate repository: ${e.reason}`),
            AuthTokenError: () =>
              httpError(
                401,
                'Authentication token is invalid. Please reconnect your account.'
              ),
            GitProviderError: (e) =>
              httpError(502, `Git provider error: ${e.message}`),
          })
        ),
        { fallbackMessage: 'Failed to force sync site' }
      );
    }
  );
};
