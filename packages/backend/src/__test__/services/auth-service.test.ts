import { Effect, Layer, ManagedRuntime, Exit } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  AuthProviderRepository,
  type AuthProviderRepositoryService,
} from '../../repositories/auth-provider-repository';
import { AuthService } from '../../services/auth';
import { makeMockAuthProvider } from '../helpers/mock-auth-provider';
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database';
import { mockGitIntegration, mockUser } from '../helpers/mock-factories';
import { TestRepositoryLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(TestRepositoryLayer);

describe('AuthService', () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  describe('fetchUser', () => {
    it('should return platform user from auth provider', async () => {
      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          return yield* auth.fetchUser('mock-access-token');
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          username: 'testuser',
          displayName: 'Test User',
        })
      );
    });
  });

  describe('fetchUserEmail', () => {
    it('should return user email from auth provider', async () => {
      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          return yield* auth.fetchUserEmail('mock-access-token');
        })
      );

      expect(result).toBe('test@example.com');
    });
  });

  describe('getUserAuthToken', () => {
    it('should return access token when valid', async () => {
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration({ accessToken: 'valid-token' })
      );

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          return yield* auth.getUserAuthToken('user-1');
        })
      );

      expect(result).toBe('valid-token');
    });

    it('should fail and clear token when validation fails', async () => {
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration({ accessToken: 'expired-token' })
      );
      mockPrisma.gitIntegration.updateMany.mockResolvedValue({ count: 1 });

      // Create runtime with invalid-token mock
      const invalidTokenProvider: AuthProviderRepositoryService = {
        ...makeMockAuthProvider(),
        validateToken: () =>
          Effect.succeed({ isValid: false, reason: 'Token expired' }),
      };
      const invalidTokenLayer = Layer.merge(
        TestRepositoryLayer,
        Layer.succeed(AuthProviderRepository, invalidTokenProvider)
      );
      const invalidRuntime = ManagedRuntime.make(invalidTokenLayer);

      const result = await invalidRuntime.runPromiseExit(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          return yield* auth.getUserAuthToken('user-1');
        })
      );

      expect(Exit.isFailure(result)).toBe(true);
      // Should have cleared the invalid token
      expect(mockPrisma.gitIntegration.updateMany).toHaveBeenCalled();
    });

    it('should fail when no integration exists', async () => {
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(null);

      const result = await testRuntime.runPromiseExit(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          return yield* auth.getUserAuthToken('user-1');
        })
      );

      expect(Exit.isFailure(result)).toBe(true);
    });
  });

  describe('clearUserAuth', () => {
    it('should clear auth token via user repository', async () => {
      mockPrisma.gitIntegration.updateMany.mockResolvedValue({
        count: 1,
      });

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          yield* auth.clearUserAuth('user-1');
        })
      );

      expect(mockPrisma.gitIntegration.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', platform: 'github' },
        data: expect.objectContaining({ accessToken: '' }),
      });
    });
  });

  describe('processOAuth', () => {
    it('should create user and git integration from OAuth token', async () => {
      const user = mockUser();
      mockPrisma.user.upsert.mockResolvedValue(user);
      mockPrisma.gitIntegration.upsert.mockResolvedValue(mockGitIntegration());

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const auth = yield* AuthService;
          return yield* auth.processOAuth('mock-access-token');
        })
      );

      expect(result.user).toEqual(user);
      expect(result.platformUser).toEqual(
        expect.objectContaining({ username: 'testuser' })
      );
      expect(mockPrisma.user.upsert).toHaveBeenCalled();
      expect(mockPrisma.gitIntegration.upsert).toHaveBeenCalled();
    });
  });
});
