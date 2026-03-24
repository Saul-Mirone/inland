import type { FastifyInstance } from 'fastify';

import { Effect } from 'effect';

import { UserService } from '../../services/user';
import { httpError, runRouteEffect } from '../../utils/route-effect';

export const getCurrentUserRoute = async (fastify: FastifyInstance) => {
  fastify.get(
    '/auth/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!;

      const getUserInfo = Effect.gen(function* () {
        const userService = yield* UserService;
        const user = yield* userService.findUserById(userPayload.userId);

        return {
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            gitIntegrations: user.gitIntegrations.map((integration) => ({
              platform: integration.platform,
              platformUsername: integration.platformUsername,
            })),
          },
        };
      });

      return runRouteEffect(
        fastify,
        reply,
        getUserInfo.pipe(
          Effect.catchTags({
            UserNotFoundError: () => httpError(404, 'User not found'),
          })
        ),
        { fallbackMessage: 'Failed to fetch user info' }
      );
    }
  );
};
