import { Context, Data, type Effect } from 'effect'

// Generic platform user information
export interface PlatformUser {
  readonly id: string | number
  readonly username: string
  readonly email: string | null
  readonly avatarUrl: string
}

// Generic auth provider errors
export class AuthProviderAPIError extends Data.TaggedError(
  'AuthProviderAPIError'
)<{
  readonly message: string
  readonly status?: number
}> {}

export interface TokenValidationResult {
  readonly isValid: boolean
  readonly reason?: string
}

// Generic auth provider interface (platform-agnostic)
export interface AuthProviderRepositoryService {
  /**
   * Fetch user information from the platform
   */
  readonly fetchUser: (
    accessToken: string
  ) => Effect.Effect<PlatformUser, AuthProviderAPIError>

  /**
   * Fetch user email from the platform
   * Some platforms may not return email in the main user endpoint
   */
  readonly fetchUserEmail: (
    accessToken: string
  ) => Effect.Effect<string | null, AuthProviderAPIError>

  /**
   * Validate access token with the platform
   */
  readonly validateToken: (
    accessToken: string
  ) => Effect.Effect<TokenValidationResult, AuthProviderAPIError>
}

// Effect Context for dependency injection
export const AuthProviderRepository =
  Context.GenericTag<AuthProviderRepositoryService>(
    '@services/AuthProviderRepository'
  )
