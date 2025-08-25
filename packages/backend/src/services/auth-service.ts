import { Effect, Data } from 'effect'

import type { JWTPayload } from '../types/auth'

import { GitProviderRepository } from '../repositories/git-provider-repository'
import { UserRepository } from '../repositories/user-repository'
import * as UserService from './user'

export class GitHubAPIError extends Data.TaggedError('GitHubAPIError')<{
  readonly message: string
  readonly status?: number
}> {}

export class GitHubTokenError extends Data.TaggedError('GitHubTokenError')<{
  readonly message: string
}> {}

export class TokenGenerationError extends Data.TaggedError(
  'TokenGenerationError'
)<{
  readonly reason: string
}> {}

export interface GitHubTokenResponse {
  readonly access_token: string
  readonly token_type: string
  readonly scope: string
}

export const fetchGitHubUser = (accessToken: string) =>
  Effect.gen(function* () {
    const gitProvider = yield* GitProviderRepository
    return yield* gitProvider.fetchGitHubUser(accessToken)
  })

export const fetchGitHubUserEmail = (accessToken: string) =>
  Effect.gen(function* () {
    const gitProvider = yield* GitProviderRepository
    return yield* gitProvider.fetchGitHubUserEmail(accessToken)
  })

export const getUserGitHubToken = (userId: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    const gitProvider = yield* GitProviderRepository

    const accessToken = yield* userRepo.getGitHubToken(userId)

    if (!accessToken) {
      return yield* new GitHubTokenError({
        message: 'No GitHub integration found for user',
      })
    }

    // Validate token using git provider
    const validation = yield* gitProvider.validateGitHubToken(accessToken)

    if (!validation.isValid) {
      // Token is invalid, clear it from database
      yield* userRepo.clearGitHubToken(userId)
      return yield* new GitHubTokenError({
        message:
          validation.reason ||
          'GitHub token is invalid. Please reconnect your GitHub account.',
      })
    }

    return accessToken
  })

export const processGitHubOAuth = (accessToken: string) =>
  Effect.gen(function* () {
    const githubUser = yield* fetchGitHubUser(accessToken)

    let email = githubUser.email
    if (!email) {
      email = yield* fetchGitHubUserEmail(accessToken)
    }

    const user = yield* UserService.upsertUser({
      username: githubUser.login,
      email,
      avatarUrl: githubUser.avatar_url,
    })

    yield* UserService.upsertGitIntegration({
      userId: user.id,
      platform: 'github',
      platformUsername: githubUser.login,
      accessToken,
    })

    return { user, githubUser }
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
