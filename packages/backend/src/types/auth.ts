import type { OAuth2Namespace } from '@fastify/oauth2'

export interface JWTPayload {
  userId: string
  username: string
  email: string | null
  iat?: number
  exp?: number
}

export interface GitHubUser {
  id: number
  login: string
  email: string | null
  avatar_url: string
}

export interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
  visibility: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    jwtPayload?: JWTPayload
  }

  interface FastifyInstance {
    github: OAuth2Namespace
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
  }
}
