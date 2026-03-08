import type { FastifyInstance } from 'fastify'

import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import oauth2 from '@fastify/oauth2'
import redis from '@fastify/redis'
import session from '@fastify/session'
import fastifyPlugin from 'fastify-plugin'

import type { JWTPayload } from '../types/auth'

import { resolveConfig } from '../services/config-service'

const authPlugin = async (fastify: FastifyInstance) => {
  const config = resolveConfig()

  await fastify.register(cookie)

  // Register JWT plugin
  await fastify.register(jwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: '7d',
    },
  })

  // Register session plugin with Redis store
  await fastify.register(session, {
    secret: config.sessionSecret,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
    store: undefined, // Will be configured with Redis later
  })

  // Register Redis plugin
  await fastify.register(redis, {
    url: config.redisUrl,
  })

  // Register OAuth2 plugin for GitHub
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

  // JWT verification decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify()
      // Store the JWT payload in jwtPayload property to avoid conflicts
      request.jwtPayload = request.user as JWTPayload
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}

export const fastifyAuthPlugin = fastifyPlugin(authPlugin, {
  name: 'auth',
  dependencies: ['database'],
})
