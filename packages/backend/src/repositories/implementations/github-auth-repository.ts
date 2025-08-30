import { Effect, Layer } from 'effect'

import {
  AuthProviderRepository,
  type AuthProviderRepositoryService,
  type PlatformUser,
  AuthProviderAPIError,
} from '../auth-provider-repository'

// GitHub-specific types
interface GitHubUser {
  readonly id: number
  readonly login: string
  readonly email: string | null
  readonly avatar_url: string
}

interface GitHubEmail {
  readonly email: string
  readonly primary: boolean
  readonly verified: boolean
}

// GitHub API helper
const makeGitHubApiRequest = (accessToken: string, endpoint: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`https://api.github.com${endpoint}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'Inland-CMS/1.0',
            Accept: 'application/vnd.github.v3+json',
          },
        }),
      catch: (error) =>
        new AuthProviderAPIError({
          message: error instanceof Error ? error.message : 'Network error',
        }),
    })

    if (!response.ok) {
      return yield* new AuthProviderAPIError({
        message: `GitHub API error: ${response.status} ${response.statusText}`,
        status: response.status,
      })
    }

    const data = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () =>
        new AuthProviderAPIError({
          message: 'Failed to parse GitHub API response',
        }),
    })

    return data
  })

// Convert GitHub user to platform user
const convertGitHubUserToPlatformUser = (
  githubUser: GitHubUser
): PlatformUser => ({
  id: githubUser.id,
  username: githubUser.login,
  email: githubUser.email,
  avatarUrl: githubUser.avatar_url,
})

// GitHub auth provider implementation
export const makeGitHubAuthRepository = (): AuthProviderRepositoryService => ({
  fetchUser: (accessToken: string) =>
    Effect.gen(function* () {
      const githubUser = yield* makeGitHubApiRequest(accessToken, '/user')
      return convertGitHubUserToPlatformUser(githubUser as GitHubUser)
    }),

  fetchUserEmail: (accessToken: string) =>
    Effect.gen(function* () {
      const emails = yield* makeGitHubApiRequest(accessToken, '/user/emails')

      if (!Array.isArray(emails)) {
        return null
      }

      const emailArray = emails as GitHubEmail[]
      const primaryEmail = emailArray.find((e) => e.primary)
      return primaryEmail?.email || null
    }).pipe(Effect.catchAll(() => Effect.succeed(null))),

  validateToken: (accessToken: string) =>
    Effect.gen(function* () {
      yield* makeGitHubApiRequest(accessToken, '/user')
      return { isValid: true }
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed({
          isValid: false,
          reason: 'GitHub token validation failed',
        })
      )
    ),
})

// Layer for dependency injection
export const GitHubAuthRepositoryLive = Layer.succeed(
  AuthProviderRepository,
  makeGitHubAuthRepository()
)
