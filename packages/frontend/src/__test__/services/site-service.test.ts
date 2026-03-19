import { Effect, ManagedRuntime } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import { SiteService } from '@/services/site';

import {
  mockApi,
  resetMockApi,
  apiSuccess,
  apiError,
} from '../helpers/mock-api-client';
import { mockSite } from '../helpers/mock-factories';
import { mockSitesModel, resetMockSitesModel } from '../helpers/mock-models';
import { resetMockNav } from '../helpers/mock-navigation';
import { SiteTestLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(SiteTestLayer);

describe('SiteService', () => {
  beforeEach(() => {
    resetMockApi();
    resetMockSitesModel();
    resetMockNav();
  });

  describe('fetchSites', () => {
    it('should fetch sites and update model', async () => {
      const sites = [
        mockSite({ id: 's1', name: 'Site 1' }),
        mockSite({ id: 's2', name: 'Site 2' }),
      ];
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.fetchSites();
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/sites?page=1&limit=20');
      expect(mockSitesModel.sites$.getValue()).toEqual(sites);
      expect(mockSitesModel.pagination$.getValue()).toEqual({
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockSitesModel.loading$.getValue()).toBe(false);
    });

    it('should pass custom page and limit', async () => {
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [],
          total: 0,
          page: 2,
          limit: 10,
          totalPages: 0,
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.fetchSites(2, 10);
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/sites?page=2&limit=10');
    });

    it('should handle errors', async () => {
      mockApi.get.mockReturnValue(apiError(500, 'Failed'));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.fetchSites();
        })
      );

      expect(mockSitesModel.error$.getValue()).toBe('Failed');
      expect(mockSitesModel.loading$.getValue()).toBe(false);
    });
  });

  describe('deleteSite', () => {
    it('should optimistically remove site and call API', async () => {
      const sites = [mockSite({ id: 's1' }), mockSite({ id: 's2' })];
      mockSitesModel.sites$.next(sites);
      mockApi.del.mockReturnValue(apiSuccess({}));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.deleteSite('s1');
        })
      );

      expect(mockApi.del).toHaveBeenCalledWith('/sites/s1');
      expect(
        mockSitesModel.sites$.getValue().find((s) => s.id === 's1')
      ).toBeUndefined();
    });

    it('should refetch on delete error', async () => {
      mockSitesModel.sites$.next([mockSite({ id: 's1' })]);
      mockApi.del.mockReturnValue(apiError(500, 'Delete failed'));
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [mockSite({ id: 's1' })],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.deleteSite('s1');
        })
      );

      expect(mockApi.get).toHaveBeenCalled();
    });
  });

  describe('createSite', () => {
    it('should create site and refetch', async () => {
      mockApi.post.mockReturnValue(apiSuccess({}));
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        })
      );

      const data = {
        name: 'New Site',
        templateOwner: 'owner',
        templateRepo: 'repo',
      };

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.createSite(data);
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/sites', data);
      expect(mockApi.get).toHaveBeenCalled();
    });
  });

  describe('importSite', () => {
    it('should import site and return result', async () => {
      mockApi.post.mockReturnValue(apiSuccess({ articlesImported: 5 }));
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        })
      );

      const data = {
        name: 'Imported Site',
        gitRepoFullName: 'user/repo',
        setupWorkflow: true,
        enablePages: true,
        overrideExistingFiles: false,
      };

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.importSite(data);
        })
      );

      expect(result).toEqual({ articlesImported: 5 });
      expect(mockApi.post).toHaveBeenCalledWith('/sites/import', data);
    });

    it('should return undefined on error', async () => {
      mockApi.post.mockReturnValue(apiError(400, 'Import failed'));

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.importSite({
            name: 'Bad Site',
            gitRepoFullName: 'user/repo',
            setupWorkflow: false,
            enablePages: false,
            overrideExistingFiles: false,
          });
        })
      );

      expect(result).toBeUndefined();
    });
  });
});
