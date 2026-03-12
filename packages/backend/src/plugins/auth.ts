import type { FastifyInstance, FastifyReply } from 'fastify'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import oauth2 from '@fastify/oauth2'
import session from '@fastify/session'
import { Effect } from 'effect'
import fastifyPlugin from 'fastify-plugin'

import type { JWTPayload } from '../types/auth'

import { resolveConfig } from '../services/config-service'
import { SessionService } from '../services/session'

export const AUTH_COOKIE_NAME = 'inland_auth'
export const REFRESH_COOKIE_NAME = 'inland_refresh'
const ACCESS_TOKEN_MAX_AGE = 60 * 15
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30

const getCookieOptions = (secure: boolean, maxAge: number) => ({
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure,
  maxAge,
})

const authPlugin = async (fastify: FastifyInstance) => {
  const config = resolveConfig()
  const secureCookie = config.appUrl.startsWith('https://')

  await fastify.register(cookie)

  await fastify.register(jwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: AUTH_COOKIE_NAME,
      signed: false,
    },
  })

  await fastify.register(session, {
    secret: config.sessionSecret,
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
    store: undefined,
  })

  await fastify.register(oauth2, {
    name: 'github',
    credentials: {
      client: {
        id: config.githubClientId,
        secret: config.githubClientSecret,
      },
      auth: {
        authorizeHost: 'https://github.com',
        authorizePath: '/login/oauth/authorize',
        tokenHost: 'https://github.com',
        tokenPath: '/login/oauth/access_token',
      },
    },
    startRedirectPath: '/auth/github',
    callbackUri: config.authCallbackUrl,
    scope: ['user:email', 'public_repo', 'workflow'],
  })

  fastify.decorate(
    'setAuthCookie',
    async (reply: FastifyReply, payload: JWTPayload) => {
      const accessToken = await fastify.runtime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.signAccessToken(payload)
        })
      )

      reply.setCookie(
        AUTH_COOKIE_NAME,
        accessToken,
        getCookieOptions(secureCookie, ACCESS_TOKEN_MAX_AGE)
      )
    }
  )

  fastify.decorate('clearAuthCookie', (reply: FastifyReply) => {
    reply.clearCookie(
      AUTH_COOKIE_NAME,
      getCookieOptions(secureCookie, ACCESS_TOKEN_MAX_AGE)
    )
  })

  fastify.decorate(
    'createRefreshSession',
    async (reply: FastifyReply, payload: JWTPayload) => {
      const refreshToken = await fastify.runtime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.createSession(payload)
        })
      )

      reply.setCookie(
        REFRESH_COOKIE_NAME,
        refreshToken,
        getCookieOptions(secureCookie, REFRESH_TOKEN_MAX_AGE)
      )

      return refreshToken
    }
  )

  fastify.decorate(
    'getRefreshSession',
    async (refreshToken?: string | null) => {
      if (!refreshToken) {
        return null
      }

      return fastify.runtime.runPromise(
        Effect.gen(function* () {
          const sessionService = yield* SessionService
          return yield* sessionService.getSession(refreshToken)
        })
      )
    }
  )

  fastify.decorate(
    'clearRefreshSession',
    async (reply: FastifyReply, refreshToken?: string | null) => {
      if (refreshToken) {
        await fastify.runtime.runPromise(
          Effect.gen(function* () {
            const sessionService = yield* SessionService
            return yield* sessionService.clearSession(refreshToken)
          })
        )
      }

      reply.clearCookie(
        REFRESH_COOKIE_NAME,
        getCookieOptions(secureCookie, REFRESH_TOKEN_MAX_AGE)
      )
    }
  )

  fastify.decorate('authenticateRefresh', async function (request, reply) {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME]
    const refreshSession = await fastify.getRefreshSession(refreshToken)

    if (!refreshSession) {
      fastify.clearAuthCookie(reply)
      await fastify.clearRefreshSession(reply, refreshToken)
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }

    request.jwtPayload = refreshSession
    request.refreshToken = refreshToken
  })

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
      request.jwtPayload = request.user as JWTPayload
    } catch {
      fastify.clearAuthCookie(reply)
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}

export const fastifyAuthPlugin = fastifyPlugin(authPlugin, {
  name: 'auth',
  dependencies: ['redis', 'effect-runtime'],
})
