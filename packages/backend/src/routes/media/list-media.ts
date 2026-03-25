import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { MediaService } from '../../services/media';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const listMediaRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/sites/:id/media',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.SiteParam,
          querystring: Schemas.PaginationParams,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<
        unknown,
        Schemas.SiteParam,
        Schemas.PaginationParams
      >,
      reply
    ) => {
      const userPayload = request.jwtPayload!;
      const { id: siteId } = request.validatedParams!;
      const { page, limit } = request.validatedQuery!;

      const list = Effect.gen(function* () {
        const mediaService = yield* MediaService;
        const result = yield* mediaService.listMedia(
          siteId,
          userPayload.userId,
          { page, limit }
        );
        return {
          media: result.items.map((item) => ({
            ...item,
            fileSize: item.fileSize.toString(),
          })),
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        };
      });

      return runRouteEffect(
        fastify,
        reply,
        list.pipe(
          Effect.catchTags({
            SiteAccessDeniedError: () => httpError(403, 'Access denied'),
          })
        ),
        { fallbackMessage: 'Failed to list media' }
      );
    }
  );
};
