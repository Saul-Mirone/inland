import type { FastifyInstance } from 'fastify'

import { Effect } from 'effect'

import {
  withSchemaValidation,
  type TypedFastifyRequest,
} from '../../plugins/schema-validation'
import * as Schemas from '../../schemas'
import * as AuthService from '../../services/auth-service'
import { ConfigService } from '../../services/config-service'
import { createAppRuntime } from '../../utils/effect-runtime'

export const githubCallbackRoute = async (fastify: FastifyInstance) => {
  const runtime = createAppRuntime(fastify.prisma)

  const getAppUrl = Effect.gen(function* () {
    const config = yield* ConfigService
    return config.appUrl
  })

  const createErrorRedirect = (reason?: string) =>
    Effect.gen(function* () {
      const appUrl = yield* getAppUrl
      const errorPath = reason ? `/auth/error?reason=${reason}` : '/auth/error'
      return `${appUrl}${errorPath}`
    })

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

        if (query.error) {
          yield* Effect.logWarning(
            `OAuth error: ${query.error} - ${query.error_description || 'No description'}`
          )

          const redirectUrl = yield* createErrorRedirect('provider')
          return reply.redirect(redirectUrl)
        }

        const { token } = yield* getGitHubToken(request)

        const { user } = yield* AuthService.processOAuth(token.access_token)
        const config = yield* ConfigService

        const jwtPayload = AuthService.generateJWTPayload(user)

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
}
