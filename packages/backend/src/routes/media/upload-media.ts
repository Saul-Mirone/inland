import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation';
import * as Schemas from '../../schemas';
import { MediaService } from '../../services/media';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const uploadMediaRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/sites/:id/media',
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
      const { id: siteId } = request.validatedParams!;

      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      const buffer = await file.toBuffer();
      const alt =
        file.fields.alt &&
        'value' in file.fields.alt &&
        typeof file.fields.alt.value === 'string'
          ? file.fields.alt.value
          : undefined;

      const upload = Effect.gen(function* () {
        const mediaService = yield* MediaService;
        return yield* mediaService.uploadMedia({
          siteId,
          userId: userPayload.userId,
          filename: file.filename,
          buffer,
          mimeType: file.mimetype,
          alt,
        });
      });

      return runRouteEffect(
        fastify,
        reply,
        upload.pipe(
          Effect.catchTags({
            MediaValidationError: (e) => httpError(400, e.message),
            MediaOperationError: (e) => httpError(502, e.reason),
            SiteAccessDeniedError: () => httpError(403, 'Access denied'),
            GitRepositoryError: (e) => httpError(400, e.message),
            AuthTokenError: () =>
              httpError(
                401,
                'Authentication token is invalid. Please reconnect your account.'
              ),
          })
        ),
        { successCode: 201, fallbackMessage: 'Failed to upload media' }
      );
    }
  );
};
