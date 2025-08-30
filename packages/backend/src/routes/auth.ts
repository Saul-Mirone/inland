import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../plugins/schema-validation'
import * as Schemas from '../schemas'
import * as AuthService from '../services/auth-service'
import { ConfigService } from '../services/config-service'
import * as UserService from '../services/user'
import { createAppRuntime } from '../utils/effect-runtime'

export const authEffectRoutes = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  // GitHub OAuth callback handler with Effect
  fastify.get(
    '/auth/github/callback',
    {
      preHandler: [
        withSchemaValidation({
          querystring: Schemas.GitHubCallbackQuery,
        }),
      ],
    },
    async (
      request: TypedFastifyRequest<
        unknown,
        unknown,
        Schemas.GitHubCallbackQuery
      >,
      reply
    ) => {
      try {
        const query = request.validatedQuery!

        // Check for OAuth errors first
        if (query.error) {
          fastify.log.warn(
            `OAuth error: ${query.error} - ${query.error_description || 'No description'}`
          )
          return reply.redirect(
            'http://localhost:3000/auth/error?reason=provider'
          )
        }

        // Exchange code for access token (keeping this as regular async/await)
        const { token } =
          await fastify.github.getAccessTokenFromAuthorizationCodeFlow(request)

        // Process GitHub OAuth using Effect services
        const processOAuth = Effect.gen(function* () {
          const { user } = yield* AuthService.processOAuth(token.access_token)
          const config = yield* ConfigService

          // Generate JWT payload
          const jwtPayload = AuthService.generateJWTPayload(user)

          // Generate JWT token
          const jwtToken = fastify.jwt.sign(jwtPayload)

          return {
            redirectUrl: `${config.appUrl}/auth/callback?token=${jwtToken}`,
          }
        })

        return runtime.runPromise(
          processOAuth.pipe(
            Effect.catchTag('AuthProviderAPIError', () =>
              Effect.sync(() =>
                reply.redirect(
                  'http://localhost:3000/auth/error?reason=provider'
                )
              )
            ),
            Effect.matchEffect({
              onFailure: (error) =>
                Effect.sync(() => {
                  fastify.log.error(error)
                  return reply.redirect('http://localhost:3000/auth/error')
                }),
              onSuccess: (result) =>
                Effect.sync(() => {
                  return reply.redirect(
                    (result as { redirectUrl: string }).redirectUrl
                  )
                }),
            })
          )
        )
      } catch (error) {
        fastify.log.error(error)
        return reply.redirect('http://localhost:3000/auth/error')
      }
    }
  )

  // Get current user info with Effect
  fastify.get(
    '/auth/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!

      const getUserInfo = Effect.gen(function* () {
        const user = yield* UserService.findUserById(userPayload.userId)

        return {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt,
            gitIntegrations: user.gitIntegrations.map((integration) => ({
              platform: integration.platform,
              platformUsername: integration.platformUsername,
            })),
          },
        }
      })

      return runtime.runPromise(
        getUserInfo.pipe(
          Effect.catchTag('UserNotFoundError', () =>
            Effect.sync(() => reply.code(404).send({ error: 'User not found' }))
          ),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.sync(() => {
                fastify.log.error(error)
                return reply
                  .code(500)
                  .send({ error: 'Failed to fetch user info' })
              }),
            onSuccess: (result) =>
              Effect.sync(() => {
                return reply.send(result)
              }),
          })
        )
      )
    }
  )

  // Refresh token endpoint with Effect
  fastify.post(
    '/auth/refresh',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const userPayload = request.jwtPayload!
      const { userId, username, email } = userPayload

      // Generate new JWT token
      const newToken = fastify.jwt.sign({
        userId,
        username,
        email,
      })

      return reply.send({ token: newToken })
    }
  )

  // Logout endpoint (no Effect needed for this simple case)
  fastify.post('/auth/logout', async () => {
    return { message: 'Logged out successfully' }
  })
}
