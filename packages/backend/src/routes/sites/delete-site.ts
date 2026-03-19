import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { SiteService } from '../../services/site';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const deleteSiteRoute = async (fastify: FastifyInstance) => {
  fastify.delete(
    '/sites/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteParam,
        }),
      ],
    },
    async (request: TypedFastifyRequest<unknown, Schemas.SiteParam>, reply) => {
      const userPayload = request.jwtPayload!;
      const { id } = request.validatedParams!;

      const deleteSite = Effect.gen(function* () {
        const siteService = yield* SiteService;
        const site = yield* siteService.deleteSite(id, userPayload.userId);
        return { message: 'Site deleted successfully', site };
      });

      return runRouteEffect(
        fastify,
        reply,
        deleteSite.pipe(
          Effect.catchTags({
            SiteNotFoundError: () => httpError(404, 'Site not found'),
            SiteAccessDeniedError: () => httpError(403, 'Access denied'),
          })
        ),
        { fallbackMessage: 'Failed to delete site' }
      );
    }
  );
};
