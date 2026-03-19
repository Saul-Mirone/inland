import { Effect, ManagedRuntime } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import { AuthService } from '@/services/auth';

import { mockApi, resetMockApi, apiSuccess } from '../helpers/mock-api-client';
import { mockUser } from '../helpers/mock-factories';
import { mockAuthModel, resetMockAuthModel } from '../helpers/mock-models';
import { mockNav, resetMockNav } from '../helpers/mock-navigation';
import { AuthTestLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(AuthTestLayer);

describe('AuthService', () => {
  beforeEach(() => {
    resetMockApi();
    resetMockAuthModel();
    resetMockNav();
  });

  describe('bootstrap', () => {
    it('should fetch user and set authenticated state', async () => {
      const user = mockUser();
      mockApi.get.mockReturnValue(apiSuccess({ user }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          const result = yield* service.bootstrap();
          expect(result.status).toBe('authenticated');
          expect(result.user).toEqual(user);
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
      expect(mockAuthModel.authState$.getValue().status).toBe('authenticated');
    });

    it('should return cached state if already authenticated', async () => {
      mockAuthModel.authState$.next({
        status: 'authenticated',
        user: mockUser(),
        error: null,
      });

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          const result = yield* service.bootstrap();
          expect(result.status).toBe('authenticated');
        })
      );

      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('should force refresh when force=true', async () => {
      mockAuthModel.authState$.next({
        status: 'authenticated',
        user: mockUser(),
        error: null,
      });
      const freshUser = mockUser({ username: 'newuser' });
      mockApi.get.mockReturnValue(apiSuccess({ user: freshUser }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          const result = yield* service.bootstrap(true);
          expect(result.user?.username).toBe('newuser');
        })
      );

      expect(mockApi.get).toHaveBeenCalled();
    });

    it('should set anonymous state on 401', async () => {
      mockApi.get.mockReturnValue(
        Effect.fail({
          _tag: 'ApiError',
          status: 401,
          message: 'Unauthorized',
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          const result = yield* service.bootstrap();
          expect(result.status).toBe('anonymous');
        })
      );
    });

    it('should set error state on non-401 API error', async () => {
      mockApi.get.mockReturnValue(
        Effect.fail({
          _tag: 'ApiError',
          status: 500,
          message: 'Server error',
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          const result = yield* service.bootstrap();
          expect(result.status).toBe('anonymous');
          expect(result.error).toBe('Server error');
        })
      );
    });
  });

  describe('login', () => {
    it('should navigate to GitHub auth URL', async () => {
      mockApi.buildUrl.mockReturnValue('http://localhost:3001/auth/github');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          yield* service.login();
        })
      );

      expect(mockNav.navigate).toHaveBeenCalledWith(
        'http://localhost:3001/auth/github'
      );
    });
  });

  describe('logout', () => {
    it('should call logout API and clear state', async () => {
      mockAuthModel.authState$.next({
        status: 'authenticated',
        user: mockUser(),
        error: null,
      });
      mockApi.post.mockReturnValue(apiSuccess({}));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          yield* service.logout();
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
      expect(mockAuthModel.authState$.getValue().status).toBe('anonymous');
      expect(mockNav.navigate).toHaveBeenCalledWith('/');
    });

    it('should clear state even if logout API fails', async () => {
      mockAuthModel.authState$.next({
        status: 'authenticated',
        user: mockUser(),
        error: null,
      });
      mockApi.post.mockReturnValue(
        Effect.fail({
          _tag: 'ApiError',
          status: 500,
          message: 'Server error',
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* AuthService;
          yield* service.logout();
        })
      );

      expect(mockAuthModel.authState$.getValue().status).toBe('anonymous');
      expect(mockNav.navigate).toHaveBeenCalledWith('/');
    });
  });
});
