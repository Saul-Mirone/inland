import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import {
  AuthService,
  GitHubTokenError,
  TokenGenerationError,
  generateJWTPayload,
} from '../../services/auth'
import { ConfigService } from '../../services/config-service'
import { runRouteEffect } from '../../utils/route-effect'

export const githubCallbackRoute = async (fastify: FastifyInstance) => {
  const appUrl = await fastify.runtime.runPromise(
    Effect.map(ConfigService, (c) => c.appUrl)
  )

  const errorRedirect = (reason?: string) =>
    `${appUrl}/auth/error${reason ? `?reason=${reason}` : ''}`

  const getGitHubToken = (
    request: TypedFastifyRequest<unknown, unknown, Schemas.GitHubCallbackQuery>
  ) =>
    Effect.tryPromise({
      try: () =>
        fastify.github.getAccessTokenFromAuthorizationCodeFlow(request),
      catch: (error) =>
        new GitHubTokenError({
          message: 'Failed to get GitHub access token',
          cause: error,
        }),
    })

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
      const effect = Effect.gen(function* () {
        const query = request.validatedQuery!

        if (query.error) {
          yield* Effect.logWarning(
            `OAuth error: ${query.error} - ${query.error_description || 'No description'}`
          )

          return yield* new GitHubTokenError({
            message: query.error_description || 'OAuth authorization denied',
          })
        }

        const { token } = yield* getGitHubToken(request)

        const authService = yield* AuthService
        const { user } = yield* authService.processOAuth(token.access_token)

        const sessionPayload = generateJWTPayload(user)

        yield* Effect.tryPromise({
          try: async () => {
            await fastify.createRefreshSession(reply, sessionPayload)
            await fastify.setAuthCookie(reply, sessionPayload)
          },
          catch: () =>
            new TokenGenerationError({
              reason: 'Failed to set session cookies',
            }),
        })

        return `${appUrl}/auth/callback`
      })

      return runRouteEffect(
        fastify,
        reply,
        effect.pipe(
          Effect.map((url) => {
            reply.redirect(url)
          }),
          Effect.catchTags({
            GitHubTokenError: () =>
              Effect.sync(() => reply.redirect(errorRedirect('provider'))),
            AuthProviderAPIError: () =>
              Effect.sync(() => reply.redirect(errorRedirect('provider'))),
            TokenGenerationError: () =>
              Effect.sync(() => reply.redirect(errorRedirect())),
          }),
          Effect.catchAll((error) =>
            Effect.gen(function* () {
              yield* Effect.logError('OAuth callback failed', error)
              reply.redirect(errorRedirect())
            })
          )
        )
      )
    }
  )
}
