import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import { TokenGenerationError, generateJWTPayload } from '../../services/auth';
import { UserService } from '../../services/user';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const refreshTokenRoute = async (fastify: FastifyInstance) => {
  fastify.post(
    '/auth/refresh',
    {
      preHandler: [fastify.authenticateRefresh],
    },
    async (request, reply) => {
      const userId = request.jwtPayload!.userId;
      const refreshToken = request.refreshToken;

      const refreshSession = Effect.gen(function* () {
        const userService = yield* UserService;
        const user = yield* userService.findUserById(userId);
        const sessionPayload = generateJWTPayload(user);

        yield* Effect.tryPromise({
          try: async () => {
            await fastify.clearRefreshSession(reply, refreshToken);
            await fastify.createRefreshSession(reply, sessionPayload);
            await fastify.setAuthCookie(reply, sessionPayload);
          },
          catch: () =>
            new TokenGenerationError({
              reason: 'Failed to refresh session cookies',
            }),
        });

        return { message: 'Session refreshed' };
      });

      return runRouteEffect(
        fastify,
        reply,
        refreshSession.pipe(
          Effect.catchTags({
            UserNotFoundError: () => httpError(401, 'User not found'),
            TokenGenerationError: () =>
              httpError(500, 'Failed to refresh session'),
          })
        ),
        { fallbackMessage: 'Failed to refresh token' }
      );
    }
  );
};
