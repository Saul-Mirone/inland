import { Effect, Layer } from 'effect'

import {
  AuthProviderRepository,
  type AuthProviderRepositoryService,
  type PlatformUser,
} from '../../repositories/auth-provider-repository'

// Mock implementation for testing
export const makeMockAuthProvider = (): AuthProviderRepositoryService => ({
  fetchUser: (_accessToken: string) =>
    Effect.succeed({
      id: 12345,
      username: 'testuser',
      email: 'test@example.com',
      avatarUrl: 'https://github.com/images/test-avatar.jpg',
    } as PlatformUser),

  fetchUserEmail: (_accessToken: string) => Effect.succeed('test@example.com'),

  validateToken: (_accessToken: string) =>
    Effect.succeed({
      isValid: true,
    }),
})

// Mock layer for testing
export const MockAuthProviderLive = Layer.succeed(
  AuthProviderRepository,
  makeMockAuthProvider()
)
