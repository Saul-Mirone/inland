import { Effect, Data } from 'effect'

import type { JWTPayload } from '../types/auth'

import { AuthProviderRepository } from '../repositories/auth-provider-repository'
import { UserRepository } from '../repositories/user-repository'
import * as UserService from './user'

export class AuthProviderAPIError extends Data.TaggedError(
  'AuthProviderAPIError'
)<{
  readonly message: string
  readonly status?: number
}> {}

export class AuthTokenError extends Data.TaggedError('AuthTokenError')<{
  readonly message: string
}> {}

export class TokenGenerationError extends Data.TaggedError(
  'TokenGenerationError'
)<{
  readonly reason: string
}> {}

export interface TokenResponse {
  readonly access_token: string
  readonly token_type: string
  readonly scope: string
}

export const fetchUser = (accessToken: string) =>
  Effect.gen(function* () {
    const authProvider = yield* AuthProviderRepository
    return yield* authProvider.fetchUser(accessToken)
  })

export const fetchUserEmail = (accessToken: string) =>
  Effect.gen(function* () {
    const authProvider = yield* AuthProviderRepository
    return yield* authProvider.fetchUserEmail(accessToken)
  })

export const getUserAuthToken = (userId: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const authProvider = yield* AuthProviderRepository

    const accessToken = yield* userRepo.getAuthToken(userId)

    if (!accessToken) {
      return yield* new AuthTokenError({
        message: 'No auth integration found for user',
      })
    }

    // Validate token using auth provider
    const validation = yield* authProvider.validateToken(accessToken)

    if (!validation.isValid) {
      // Token is invalid, clear it from database
      yield* userRepo.clearAuthToken(userId)
      return yield* new AuthTokenError({
        message:
          validation.reason ||
          'Auth token is invalid. Please reconnect your account.',
      })
    }

    return accessToken
  })

export const processOAuth = (accessToken: string) =>
  Effect.gen(function* () {
    const platformUser = yield* fetchUser(accessToken)

    let email = platformUser.email
    if (!email) {
      email = yield* fetchUserEmail(accessToken)
    }

    const user = yield* UserService.upsertUser({
      username: platformUser.username,
      email,
      avatarUrl: platformUser.avatarUrl,
    })

    yield* UserService.upsertGitIntegration({
      userId: user.id,
      platform: 'github',
      platformUsername: platformUser.username,
      accessToken,
    })

    return { user, platformUser }
  })

export const generateJWTPayload = (user: {
  id: string
  username: string
  email: string | null
}): JWTPayload => ({
  userId: user.id,
  username: user.username,
  email: user.email,
})
