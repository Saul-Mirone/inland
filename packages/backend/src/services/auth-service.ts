import { Effect, Data } from 'effect'

import type { GitHubUser, GitHubEmail, JWTPayload } from '../types/auth'

import * as UserService from './user-service'

export class GitHubAPIError extends Data.TaggedError('GitHubAPIError')<{
  readonly message: string
  readonly status?: number
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
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Inland-CMS',
          },
        }),
      catch: (error) =>
        new GitHubAPIError({
          message: error instanceof Error ? error.message : 'Network error',
        }),
    })

    if (!response.ok) {
      return yield* new GitHubAPIError({
        message: 'Failed to fetch user info from GitHub',
        status: response.status,
      })
    }

    const user = yield* Effect.tryPromise({
      try: () => response.json() as Promise<GitHubUser>,
      catch: () =>
        new GitHubAPIError({
          message: 'Failed to parse GitHub user response',
        }),
    })

    return user
  })

export const fetchGitHubUserEmail = (accessToken: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Inland-CMS',
          },
        }),
      catch: (error) =>
        new GitHubAPIError({
          message: error instanceof Error ? error.message : 'Network error',
        }),
    })

    if (!response.ok) {
      return null
    }

    const emails = yield* Effect.tryPromise({
      try: () => response.json() as Promise<GitHubEmail[]>,
      catch: () => null,
    })

    if (!emails) return null

    const primaryEmail = emails.find((e) => e.primary)
    return primaryEmail?.email || null
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
