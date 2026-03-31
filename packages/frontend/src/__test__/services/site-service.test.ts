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
    it('should create site, refetch, select, and fetch articles', async () => {
      mockApi.post.mockReturnValue(apiSuccess({ site: { id: 'new-site-1' } }));
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [mockSite({ id: 'new-site-1', name: 'New Site' })],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
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
      expect(mockSitesModel.selectedSiteId$.getValue()).toBe('new-site-1');
      expect(mockApi.get).toHaveBeenCalledWith('/sites?page=1&limit=20');
    });
  });

  describe('updateSite', () => {
    it('should call PUT and refetch sites', async () => {
      mockApi.put.mockReturnValue(apiSuccess({ site: { id: 's1' } }));
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [
            mockSite({
              id: 's1',
              displayName: 'Updated',
              description: 'New desc',
            }),
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.updateSite('s1', {
            displayName: 'Updated',
            description: 'New desc',
          });
        })
      );

      expect(mockApi.put).toHaveBeenCalledWith('/sites/s1', {
        displayName: 'Updated',
        description: 'New desc',
      });
      expect(mockApi.get).toHaveBeenCalledWith('/sites?page=1&limit=20');
    });

    it('should handle errors', async () => {
      mockApi.put.mockReturnValue(apiError(500, 'Update failed'));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.updateSite('s1', { displayName: 'Fail' });
        })
      );

      expect(mockSitesModel.error$.getValue()).toBe('Update failed');
    });
  });

  describe('importSite', () => {
    it('should import site, select, and return result', async () => {
      mockApi.post.mockReturnValue(
        apiSuccess({
          site: { id: 'imported-1' },
          articlesImported: 5,
        })
      );
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [mockSite({ id: 'imported-1', name: 'Imported Site' })],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
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

      expect(result).toEqual({
        site: { id: 'imported-1' },
        articlesImported: 5,
      });
      expect(mockApi.post).toHaveBeenCalledWith('/sites/import', data);
      expect(mockSitesModel.selectedSiteId$.getValue()).toBe('imported-1');
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

  describe('bootstrap', () => {
    it('should fetch sites and select the first one', async () => {
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
          yield* service.bootstrap();
        })
      );

      expect(mockSitesModel.selectedSiteId$.getValue()).toBe('s1');
    });

    it('should not override already selected site', async () => {
      mockSitesModel.selectedSiteId$.next('existing-id');
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
          yield* service.bootstrap();
        })
      );

      expect(mockSitesModel.selectedSiteId$.getValue()).toBe('existing-id');
    });
  });

  describe('selectSite', () => {
    it('should set selectedSiteId', async () => {
      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.selectSite('site-42');
        })
      );

      expect(mockSitesModel.selectedSiteId$.getValue()).toBe('site-42');
    });
  });

  describe('deselectSite', () => {
    it('should clear selectedSiteId', async () => {
      mockSitesModel.selectedSiteId$.next('some-site');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.deselectSite();
        })
      );

      expect(mockSitesModel.selectedSiteId$.getValue()).toBe(null);
    });
  });

  describe('syncArticles', () => {
    it('should sync and return result', async () => {
      mockApi.post.mockReturnValue(
        apiSuccess({
          created: 2,
          updated: 1,
          markedDraft: 0,
          unchanged: 3,
          total: 6,
        })
      );
      mockApi.get.mockReturnValue(apiSuccess({ articles: [] }));

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.syncArticles('site-1');
        })
      );

      expect(result).toEqual({
        created: 2,
        updated: 1,
        markedDraft: 0,
        unchanged: 3,
        total: 6,
      });
      expect(mockApi.post).toHaveBeenCalledWith('/sites/site-1/sync');
    });

    it('should return undefined on error', async () => {
      mockApi.post.mockReturnValue(apiError(500, 'Sync failed'));

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.syncArticles('site-1');
        })
      );

      expect(result).toBeUndefined();
    });
  });

  describe('fetchRepoConfig', () => {
    it('should return config when repo has inland.config.json', async () => {
      const config = {
        name: 'My Blog',
        description: 'A cool blog',
        url: 'https://user.github.io/my-blog',
        author: 'testuser',
        avatarUrl: 'https://github.com/testuser.png',
        authorUrl: 'https://github.com/testuser',
      };
      mockApi.get.mockReturnValue(apiSuccess({ config }));

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.fetchRepoConfig('user/my-blog');
        })
      );

      expect(result).toEqual(config);
      expect(mockApi.get).toHaveBeenCalledWith(
        '/sites/repo-config?repo=user%2Fmy-blog'
      );
    });

    it('should return null when repo has no config', async () => {
      mockApi.get.mockReturnValue(apiSuccess({ config: null }));

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.fetchRepoConfig('user/no-config');
        })
      );

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockApi.get.mockReturnValue(apiError(404, 'Not found'));

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.fetchRepoConfig('user/missing');
        })
      );

      expect(result).toBeNull();
    });
  });

  describe('forceSyncSite', () => {
    it('should force sync and return result', async () => {
      mockApi.post.mockReturnValue(
        apiSuccess({
          repoRecreated: false,
          published: 3,
          deleted: 1,
          failed: 0,
          mediaImported: 0,
          total: 3,
        })
      );
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        })
      );

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.forceSyncSite('site-1');
        })
      );

      expect(result).toEqual({
        repoRecreated: false,
        published: 3,
        deleted: 1,
        failed: 0,
        mediaImported: 0,
        total: 3,
      });
      expect(mockApi.post).toHaveBeenCalledWith('/sites/site-1/force-sync');
    });

    it('should return undefined on error', async () => {
      mockApi.post.mockReturnValue(apiError(502, 'Git provider error'));

      const result = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          return yield* service.forceSyncSite('site-1');
        })
      );

      expect(result).toBeUndefined();
    });

    it('should refresh sites and articles after sync', async () => {
      mockApi.post.mockReturnValue(
        apiSuccess({
          repoRecreated: true,
          published: 1,
          deleted: 0,
          failed: 0,
          mediaImported: 2,
          total: 1,
        })
      );
      mockApi.get.mockReturnValue(
        apiSuccess({
          sites: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* SiteService;
          yield* service.forceSyncSite('site-1');
        })
      );

      // post for force-sync, get for fetchSites + fetchArticles
      // + refreshCurrentArticle
      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.get).toHaveBeenCalled();
    });
  });
});
