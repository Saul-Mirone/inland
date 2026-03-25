import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { MediaService } from '../../services/media';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const deleteMediaRoute = async (fastify: FastifyInstance) => {
  fastify.delete(
    '/media/:id',
    {
      preHandler: [
        fastify.authenticate,
        withSchemaValidation({
          params: Schemas.IdParam,
        }),
      ],
    },
    async (request: TypedFastifyRequest<unknown, Schemas.IdParam>, reply) => {
      const userPayload = request.jwtPayload!;
      const { id } = request.validatedParams!;

      const del = Effect.gen(function* () {
        const mediaService = yield* MediaService;
        return yield* mediaService.deleteMedia(id, userPayload.userId);
      });

      return runRouteEffect(
        fastify,
        reply,
        del.pipe(
          Effect.catchTags({
            MediaValidationError: (e) =>
              httpError(
                e.field === 'id' && e.message === 'Access denied' ? 403 : 404,
                e.message
              ),
            MediaOperationError: (e) => httpError(502, e.reason),
            AuthTokenError: () =>
              httpError(
                401,
                'Authentication token is invalid. Please reconnect your account.'
              ),
          })
        ),
        { fallbackMessage: 'Failed to delete media' }
      );
    }
  );
};
