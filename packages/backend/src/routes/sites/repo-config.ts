import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { SiteService } from '../../services/site';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const repoConfigRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/sites/repo-config',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          querystring: Schemas.RepoConfigQuery,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<unknown, unknown, Schemas.RepoConfigQuery>,
      reply
    ) => {
      const userPayload = request.jwtPayload!;
      const { repo } = request.validatedQuery!;

      const getConfigEffect = Effect.gen(function* () {
        const siteService = yield* SiteService;
        const config = yield* siteService.getRepoConfig(
          userPayload.userId,
          repo
        );
        return { config };
      });

      return runRouteEffect(
        fastify,
        reply,
        getConfigEffect.pipe(
          Effect.catchTags({
            AuthTokenError: () =>
              httpError(
                401,
                'Your connection has expired. Please reconnect your account.'
              ),
            GitProviderError: (e) =>
              httpError(
                404,
                `Repository not found or access denied: ${e.message}`
              ),
          })
        ),
        { fallbackMessage: 'Failed to fetch repository config' }
      );
    }
  );
};
