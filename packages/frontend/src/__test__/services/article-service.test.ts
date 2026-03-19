import { Effect, ManagedRuntime } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import { ArticleService } from '@/services/article';

import {
  mockApi,
  resetMockApi,
  apiSuccess,
  apiError,
} from '../helpers/mock-api-client';
import { mockArticle } from '../helpers/mock-factories';
import {
  mockArticlesModel,
  resetMockArticlesModel,
} from '../helpers/mock-models';
import { mockNav } from '../helpers/mock-navigation';
import { ArticleTestLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(ArticleTestLayer);

describe('ArticleService', () => {
  beforeEach(() => {
    resetMockApi();
    resetMockArticlesModel();
  });

  describe('fetchArticles', () => {
    it('should fetch articles and update model', async () => {
      const articles = [
        mockArticle({ id: 'a1', title: 'Article 1' }),
        mockArticle({ id: 'a2', title: 'Article 2' }),
      ];
      mockApi.get.mockReturnValue(apiSuccess({ articles }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.fetchArticles();
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/articles');
      expect(mockArticlesModel.articles$.getValue()).toEqual(articles);
      expect(mockArticlesModel.loading$.getValue()).toBe(false);
    });

    it('should fetch articles for a specific site', async () => {
      mockApi.get.mockReturnValue(apiSuccess({ articles: [] }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.fetchArticles('site-1');
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/sites/site-1/articles');
    });

    it('should set loading state during fetch', async () => {
      const loadingStates: boolean[] = [];
      mockApi.get.mockImplementation(() => {
        loadingStates.push(mockArticlesModel.loading$.getValue());
        return apiSuccess({ articles: [] });
      });

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.fetchArticles();
        })
      );

      expect(loadingStates[0]).toBe(true);
      expect(mockArticlesModel.loading$.getValue()).toBe(false);
    });

    it('should handle API errors', async () => {
      mockApi.get.mockReturnValue(apiError(500, 'Server error'));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.fetchArticles();
        })
      );

      expect(mockArticlesModel.error$.getValue()).toBe('Server error');
      expect(mockArticlesModel.loading$.getValue()).toBe(false);
    });

    it('should redirect on auth errors', async () => {
      mockApi.get.mockReturnValue(
        Effect.fail({
          _tag: 'ApiError',
          status: 401,
          message: 'Unauthorized',
          redirectUrl: '/login',
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.fetchArticles();
        })
      );

      expect(mockNav.navigateDelayed).toHaveBeenCalledWith('/login', 3000);
    });
  });

  describe('createArticle', () => {
    it('should create article and refetch', async () => {
      mockApi.post.mockReturnValue(apiSuccess({}));
      mockApi.get.mockReturnValue(apiSuccess({ articles: [] }));

      const data = {
        siteId: 'site-1',
        title: 'New Article',
        content: 'Content',
        status: 'draft' as const,
      };

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.createArticle(data);
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/articles', data);
      expect(mockApi.get).toHaveBeenCalledWith('/articles');
    });

    it('should handle create errors', async () => {
      mockApi.post.mockReturnValue(apiError(400, 'Validation error'));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.createArticle({
            siteId: 'site-1',
            title: '',
            content: '',
            status: 'draft',
          });
        })
      );

      expect(mockArticlesModel.error$.getValue()).toBe('Validation error');
    });
  });

  describe('updateArticle', () => {
    it('should update article and refetch', async () => {
      mockApi.put.mockReturnValue(apiSuccess({}));
      mockApi.get.mockReturnValue(apiSuccess({ articles: [] }));

      const data = {
        siteId: 'site-1',
        title: 'Updated',
        content: 'Updated content',
        status: 'published' as const,
      };

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.updateArticle('article-1', data);
        })
      );

      expect(mockApi.put).toHaveBeenCalledWith('/articles/article-1', data);
    });
  });

  describe('deleteArticle', () => {
    it('should optimistically remove article and call API', async () => {
      const articles = [mockArticle({ id: 'a1' }), mockArticle({ id: 'a2' })];
      mockArticlesModel.articles$.next(articles);
      mockApi.del.mockReturnValue(apiSuccess({ hasGitHubRepo: false }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.deleteArticle('a1');
        })
      );

      expect(mockApi.del).toHaveBeenCalledWith('/articles/a1');
      expect(mockArticlesModel.deletingId$.getValue()).toBe(null);
    });

    it('should refetch articles on delete error', async () => {
      mockArticlesModel.articles$.next([mockArticle({ id: 'a1' })]);
      mockApi.del.mockReturnValue(apiError(500, 'Delete failed'));
      mockApi.get.mockReturnValue(
        apiSuccess({
          articles: [mockArticle({ id: 'a1' })],
        })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.deleteArticle('a1');
        })
      );

      expect(mockApi.get).toHaveBeenCalled();
      expect(mockArticlesModel.deletingId$.getValue()).toBe(null);
    });
  });

  describe('publishArticle', () => {
    it('should publish article and update status in model', async () => {
      mockArticlesModel.articles$.next([
        mockArticle({ id: 'a1', status: 'draft' }),
      ]);
      mockApi.post.mockReturnValue(
        apiSuccess({ wasUpdate: false, filePath: 'posts/test.md' })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.publishArticle('a1');
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/articles/a1/publish');
      const updatedArticles = mockArticlesModel.articles$.getValue();
      expect(updatedArticles[0].status).toBe('published');
      expect(mockArticlesModel.publishingId$.getValue()).toBe(null);
    });
  });
});
