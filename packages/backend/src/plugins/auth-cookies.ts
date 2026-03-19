import type { FastifyInstance, FastifyReply } from 'fastify'

import { Effect } from 'effect'

import type { JWTPayload } from '../types/auth'

import { SessionService, type SessionError } from '../services/session'

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

const runSession = <A>(
  fastify: FastifyInstance,
  fn: (
    s: Effect.Effect.Success<typeof SessionService>
  ) => Effect.Effect<A, SessionError>
) => fastify.runtime.runPromise(Effect.flatMap(SessionService, fn))

export const registerCookieHelpers = (
  fastify: FastifyInstance,
  secureCookie: boolean
) => {
  fastify.decorate(
    'setAuthCookie',
    async (reply: FastifyReply, payload: JWTPayload) => {
      const accessToken = await runSession(fastify, (s) =>
        s.signAccessToken(payload)
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
      const refreshToken = await runSession(fastify, (s) =>
        s.createSession(payload)
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

      return runSession(fastify, (s) => s.getSession(refreshToken))
    }
  )

  fastify.decorate(
    'clearRefreshSession',
    async (reply: FastifyReply, refreshToken?: string | null) => {
      if (refreshToken) {
        await runSession(fastify, (s) => s.clearSession(refreshToken))
      }

      reply.clearCookie(
        REFRESH_COOKIE_NAME,
        getCookieOptions(secureCookie, REFRESH_TOKEN_MAX_AGE)
      )
    }
  )
}
