import type { FastifyInstance } from 'fastify';

import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import oauth2 from '@fastify/oauth2';
import session from '@fastify/session';
import fastifyPlugin from 'fastify-plugin';

import type { JWTPayload } from '../types/auth';

import { ConfigService } from '../services/config-service';
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  registerCookieHelpers,
} from './auth-cookies';

export { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME };

const authPlugin = async (fastify: FastifyInstance) => {
  const config = await fastify.runtime.runPromise(ConfigService);
  const secureCookie = config.appUrl.startsWith('https://');

  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: config.jwtSecret,
    cookie: { cookieName: AUTH_COOKIE_NAME, signed: false },
  });
  await fastify.register(session, {
    secret: config.sessionSecret,
    cookie: { secure: secureCookie, maxAge: 1000 * 60 * 60 * 24 },
  });
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
  });

  registerCookieHelpers(fastify, secureCookie);

  fastify.decorate('authenticateRefresh', async function (request, reply) {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    const refreshSession = await fastify.getRefreshSession(refreshToken);

    if (!refreshSession) {
      fastify.clearAuthCookie(reply);
      await fastify.clearRefreshSession(reply, refreshToken);
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }

    request.jwtPayload = refreshSession;
    request.refreshToken = refreshToken;
  });

  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
      request.jwtPayload = request.user as JWTPayload;
    } catch {
      fastify.clearAuthCookie(reply);
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
};

export const fastifyAuthPlugin = fastifyPlugin(authPlugin, {
  name: 'auth',
  dependencies: ['redis', 'effect-runtime'],
});
