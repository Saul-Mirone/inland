import { Effect, Layer } from 'effect';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';

import type { JWTPayload } from '../../types/auth';

import { ConfigService } from '../config-service';
import { RedisService } from '../redis-service';
import { SessionService } from './session-service';
import { SessionError } from './session-types';

const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;
const REFRESH_TOKEN_PREFIX = 'auth:refresh:';

const createRefreshToken = () => randomBytes(48).toString('base64url');

const getRefreshSessionKey = (token: string) =>
  `${REFRESH_TOKEN_PREFIX}${createHash('sha256').update(token).digest('hex')}`;

const parseRefreshSession = (value: string): JWTPayload | null => {
  try {
    const parsed: Partial<JWTPayload> = JSON.parse(value);

    if (
      typeof parsed.userId !== 'string' ||
      typeof parsed.username !== 'string' ||
      (parsed.email !== null && typeof parsed.email !== 'string')
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      username: parsed.username,
      email: parsed.email ?? null,
    };
  } catch {
    return null;
  }
};

export const SessionServiceLive = Layer.effect(
  SessionService,
  Effect.gen(function* () {
    const { client: redis } = yield* RedisService;
    const config = yield* ConfigService;

    const createSession = (payload: JWTPayload) =>
      Effect.tryPromise({
        try: async () => {
          const refreshToken = createRefreshToken();

          await redis.set(
            getRefreshSessionKey(refreshToken),
            JSON.stringify(payload),
            'EX',
            REFRESH_TOKEN_MAX_AGE
          );

          return refreshToken;
        },
        catch: (error) =>
          new SessionError({
            message: 'Failed to create session',
            cause: error,
          }),
      });

    const getSession = (refreshToken: string) =>
      Effect.tryPromise({
        try: async () => {
          const sessionKey = getRefreshSessionKey(refreshToken);
          const serializedPayload = await redis.get(sessionKey);

          if (!serializedPayload) {
            return null;
          }

          const payload = parseRefreshSession(serializedPayload);

          if (!payload) {
            await redis.del(sessionKey);
            return null;
          }

          return payload;
        },
        catch: (error) =>
          new SessionError({
            message: 'Failed to get session',
            cause: error,
          }),
      });

    const clearSession = (refreshToken: string) =>
      Effect.tryPromise({
        try: async () => {
          await redis.del(getRefreshSessionKey(refreshToken));
        },
        catch: (error) =>
          new SessionError({
            message: 'Failed to clear session',
            cause: error,
          }),
      });

    const signAccessToken = (payload: JWTPayload) =>
      Effect.try({
        try: () => {
          const tokenPayload: JWTPayload = {
            userId: payload.userId,
            username: payload.username,
            email: payload.email,
          };
          return jwt.sign(tokenPayload, config.jwtSecret, {
            expiresIn: 60 * 15,
          });
        },
        catch: (error) =>
          new SessionError({
            message: 'Failed to sign access token',
            cause: error,
          }),
      });

    return {
      createSession,
      getSession,
      clearSession,
      signAccessToken,
    };
  })
);
