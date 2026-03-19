import type { OAuth2Namespace } from '@fastify/oauth2'

export interface JWTPayload {
  userId: string
  username: string
  email: string | null
  iat?: number
  exp?: number
}

declare module 'fastify' {
  interface FastifyRequest {
    jwtPayload?: JWTPayload
    refreshToken?: string
  }

  interface FastifyInstance {
    github: OAuth2Namespace
    setAuthCookie: (reply: FastifyReply, payload: JWTPayload) => Promise<void>
    clearAuthCookie: (reply: FastifyReply) => void
    createRefreshSession: (
      reply: FastifyReply,
      payload: JWTPayload
    ) => Promise<string>
    getRefreshSession: (
      refreshToken?: string | null
    ) => Promise<JWTPayload | null>
    clearRefreshSession: (
      reply: FastifyReply,
      refreshToken?: string | null
    ) => Promise<void>
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
    authenticateRefresh: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
  }
}
