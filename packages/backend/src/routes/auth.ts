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

  // Atomic effect to get app URL for redirects
  const getAppUrl = Effect.gen(function* () {
    const config = yield* ConfigService
    return config.appUrl
  })

  // Atomic effect to create error redirect URL
  const createErrorRedirect = (reason?: string) =>
    Effect.gen(function* () {
      const appUrl = yield* getAppUrl
      const errorPath = reason ? `/auth/error?reason=${reason}` : '/auth/error'
      return `${appUrl}${errorPath}`
    })

  // Atomic effect to get GitHub access token
  const getGitHubToken = (
    request: TypedFastifyRequest<unknown, unknown, Schemas.GitHubCallbackQuery>
  ) =>
    Effect.tryPromise({
      try: () =>
        fastify.github.getAccessTokenFromAuthorizationCodeFlow(request),
      catch: (error) =>
        new AuthService.GitHubTokenError({
          message: 'Failed to get GitHub access token',
          cause: error,
        }),
    })

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
      const handleOAuthCallback = Effect.gen(function* () {
        const query = request.validatedQuery!

        // Check for OAuth errors first
        if (query.error) {
          yield* Effect.logWarning(
            `OAuth error: ${query.error} - ${query.error_description || 'No description'}`
          )

          const redirectUrl = yield* createErrorRedirect('provider')
          return reply.redirect(redirectUrl)
        }

        // Exchange code for access token using Effect
        const { token } = yield* getGitHubToken(request)

        // Process GitHub OAuth using Effect services
        const { user } = yield* AuthService.processOAuth(token.access_token)
        const config = yield* ConfigService

        // Generate JWT payload
        const jwtPayload = AuthService.generateJWTPayload(user)

        // Generate JWT token
        const jwtToken = fastify.jwt.sign(jwtPayload)

        const successUrl = `${config.appUrl}/auth/callback?token=${jwtToken}`
        return reply.redirect(successUrl)
      })

      return runtime.runPromise(
        handleOAuthCallback.pipe(
          Effect.catchTags({
            GitHubTokenError: () =>
              Effect.gen(function* () {
                const redirectUrl = yield* createErrorRedirect('provider')
                return reply.redirect(redirectUrl)
              }),
            AuthProviderAPIError: () =>
              Effect.gen(function* () {
                const redirectUrl = yield* createErrorRedirect('provider')
                return reply.redirect(redirectUrl)
              }),
          }),
          Effect.matchEffect({
            onFailure: (error) =>
              Effect.gen(function* () {
                yield* Effect.logError('OAuth callback failed', error)
                const redirectUrl = yield* createErrorRedirect()
                return reply.redirect(redirectUrl)
              }),
            onSuccess: (result) => Effect.succeed(result),
          })
        )
      )
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
