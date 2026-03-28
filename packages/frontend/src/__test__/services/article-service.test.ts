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

  describe('openArticle', () => {
    it('should fetch article and populate editing state', async () => {
      const article = mockArticle({
        id: 'a1',
        title: 'Hello',
        slug: 'hello',
        content: 'World',
        status: 'published',
      });
      mockApi.get.mockReturnValue(apiSuccess({ article }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.openArticle('a1');
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/articles/a1');
      expect(mockArticlesModel.currentArticle$.getValue()).toEqual(article);
      const editing = mockArticlesModel.editing$.getValue();
      expect(editing.title).toBe('Hello');
      expect(editing.slug).toBe('hello');
      expect(editing.content).toBe('World');
      expect(editing.status).toBe('published');
      expect(editing.saving).toBe(false);
      expect(mockArticlesModel.articleLoading$.getValue()).toBe(false);
    });

    it('should set articleLoading state during fetch', async () => {
      const loadingStates: boolean[] = [];
      mockApi.get.mockImplementation(() => {
        loadingStates.push(mockArticlesModel.articleLoading$.getValue());
        return apiSuccess({ article: mockArticle() });
      });

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.openArticle('a1');
        })
      );

      expect(loadingStates[0]).toBe(true);
      expect(mockArticlesModel.articleLoading$.getValue()).toBe(false);
    });

    it('should handle API errors', async () => {
      mockApi.get.mockReturnValue(apiError(404, 'Not found'));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.openArticle('missing');
        })
      );

      expect(mockArticlesModel.error$.getValue()).toBe('Not found');
    });
  });

  describe('quickCreate', () => {
    it('should create article and return id', async () => {
      const article = mockArticle({ id: 'new-1', title: 'Untitled' });
      mockApi.post.mockReturnValue(apiSuccess({ article }));

      const id = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          return yield* service.quickCreate('site-1');
        })
      );

      expect(id).toBe('new-1');
      expect(mockApi.post).toHaveBeenCalledWith('/articles', {
        siteId: 'site-1',
        title: 'Untitled',
        content: '',
        status: 'draft',
      });
    });

    it('should prepend new article to articles list', async () => {
      const existing = mockArticle({ id: 'old', title: 'Old' });
      mockArticlesModel.articles$.next([existing]);

      const created = mockArticle({ id: 'new-1', title: 'Untitled' });
      mockApi.post.mockReturnValue(apiSuccess({ article: created }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.quickCreate('site-1');
        })
      );

      const articles = mockArticlesModel.articles$.getValue();
      expect(articles).toHaveLength(2);
      expect(articles[0].id).toBe('new-1');
      expect(articles[1].id).toBe('old');
    });

    it('should increment title when Untitled exists', async () => {
      mockArticlesModel.articles$.next([mockArticle({ title: 'Untitled' })]);

      const created = mockArticle({ id: 'new-2', title: 'Untitled 2' });
      mockApi.post.mockReturnValue(apiSuccess({ article: created }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.quickCreate('site-1');
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/articles', {
        siteId: 'site-1',
        title: 'Untitled 2',
        content: '',
        status: 'draft',
      });
    });

    it('should return empty string on error', async () => {
      mockApi.post.mockReturnValue(apiError(500, 'Server error'));

      const id = await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          return yield* service.quickCreate('site-1');
        })
      );

      expect(id).toBe('');
      expect(mockArticlesModel.error$.getValue()).toBe('Server error');
    });
  });

  describe('updateEditField', () => {
    it('should update a single field in editing state', async () => {
      mockArticlesModel.editing$.next({
        title: 'Old',
        slug: 'old',
        content: '',
        excerpt: '',
        tags: '',
        status: 'draft',
        publishedAt: '',
        saving: false,
      });

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.updateEditField('title', 'New Title');
        })
      );

      const editing = mockArticlesModel.editing$.getValue();
      expect(editing.title).toBe('New Title');
      expect(editing.slug).toBe('old');
    });
  });

  describe('saveCurrentArticle', () => {
    it('should save using editing state and current article id', async () => {
      const article = mockArticle({ id: 'a1', siteId: 'site-1' });
      mockArticlesModel.currentArticle$.next(article);
      mockArticlesModel.editing$.next({
        title: 'Updated Title',
        slug: 'updated-slug',
        content: 'Updated content',
        excerpt: '',
        tags: '',
        status: 'published',
        publishedAt: '',
        saving: false,
      });
      mockApi.put.mockReturnValue(apiSuccess({}));
      mockApi.get.mockReturnValue(apiSuccess({ articles: [] }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.saveCurrentArticle();
        })
      );

      expect(mockApi.put).toHaveBeenCalledWith('/articles/a1', {
        siteId: 'site-1',
        title: 'Updated Title',
        slug: 'updated-slug',
        content: 'Updated content',
        excerpt: null,
        tags: null,
        status: 'published',
        publishedAt: null,
      });
    });

    it('should set saving flag during save', async () => {
      mockArticlesModel.currentArticle$.next(mockArticle({ id: 'a1' }));
      mockArticlesModel.editing$.next({
        title: 'T',
        slug: 's',
        content: 'C',
        excerpt: '',
        tags: '',
        status: 'draft',
        publishedAt: '',
        saving: false,
      });

      const savingStates: boolean[] = [];
      mockApi.put.mockImplementation(() => {
        savingStates.push(mockArticlesModel.editing$.getValue().saving);
        return apiSuccess({});
      });
      mockApi.get.mockReturnValue(apiSuccess({ articles: [] }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.saveCurrentArticle();
        })
      );

      expect(savingStates[0]).toBe(true);
      expect(mockArticlesModel.editing$.getValue().saving).toBe(false);
    });

    it('should do nothing when no current article', async () => {
      mockArticlesModel.currentArticle$.next(null);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.saveCurrentArticle();
        })
      );

      expect(mockApi.put).not.toHaveBeenCalled();
    });
  });

  describe('deleteCurrentArticle', () => {
    it('should delete current article and clear it from model', async () => {
      const article = mockArticle({ id: 'a1' });
      mockArticlesModel.currentArticle$.next(article);
      mockArticlesModel.articles$.next([article]);
      mockApi.del.mockReturnValue(apiSuccess({ hasGitHubRepo: false }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.deleteCurrentArticle();
        })
      );

      expect(mockApi.del).toHaveBeenCalledWith('/articles/a1');
      expect(mockArticlesModel.currentArticle$.getValue()).toBe(null);
    });

    it('should do nothing when no current article', async () => {
      mockArticlesModel.currentArticle$.next(null);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.deleteCurrentArticle();
        })
      );

      expect(mockApi.del).not.toHaveBeenCalled();
    });
  });

  describe('publishCurrentArticle', () => {
    it('should publish current article and update editing status', async () => {
      const article = mockArticle({ id: 'a1', status: 'draft' });
      mockArticlesModel.currentArticle$.next(article);
      mockArticlesModel.articles$.next([article]);
      mockArticlesModel.editing$.next({
        title: 'T',
        slug: 's',
        content: 'C',
        excerpt: '',
        tags: '',
        status: 'draft',
        publishedAt: '',
        saving: false,
      });
      mockApi.post.mockReturnValue(
        apiSuccess({ wasUpdate: false, filePath: 'posts/t.md' })
      );

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.publishCurrentArticle();
        })
      );

      expect(mockApi.post).toHaveBeenCalledWith('/articles/a1/publish');
      expect(mockArticlesModel.editing$.getValue().status).toBe('published');
    });

    it('should do nothing when no current article', async () => {
      mockArticlesModel.currentArticle$.next(null);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.publishCurrentArticle();
        })
      );

      expect(mockApi.post).not.toHaveBeenCalled();
    });
  });

  describe('clearArticles', () => {
    it('should clear articles, current article, and editing state', async () => {
      mockArticlesModel.articles$.next([mockArticle()]);
      mockArticlesModel.currentArticle$.next(mockArticle());
      mockArticlesModel.editing$.next({
        title: 'Something',
        slug: 'something',
        content: 'Content',
        excerpt: '',
        tags: '',
        status: 'published',
        publishedAt: '',
        saving: false,
      });

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.clearArticles();
        })
      );

      expect(mockArticlesModel.articles$.getValue()).toEqual([]);
      expect(mockArticlesModel.currentArticle$.getValue()).toBe(null);
      expect(mockArticlesModel.editing$.getValue().title).toBe('');
    });
  });

  describe('refreshCurrentArticle', () => {
    it('should reload current article into editor', async () => {
      const article = mockArticle({ id: 'a1', title: 'Original' });
      mockArticlesModel.currentArticle$.next(article);

      const refreshed = mockArticle({ id: 'a1', title: 'Refreshed' });
      mockApi.get.mockReturnValue(apiSuccess({ article: refreshed }));

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.refreshCurrentArticle();
        })
      );

      expect(mockApi.get).toHaveBeenCalledWith('/articles/a1');
      expect(mockArticlesModel.currentArticle$.getValue()?.title).toBe(
        'Refreshed'
      );
    });

    it('should do nothing when no current article', async () => {
      mockArticlesModel.currentArticle$.next(null);

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.refreshCurrentArticle();
        })
      );

      expect(mockApi.get).not.toHaveBeenCalled();
    });
  });

  describe('selectTag', () => {
    it('should set selectedTag', async () => {
      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.selectTag('javascript');
        })
      );

      expect(mockArticlesModel.selectedTag$.getValue()).toBe('javascript');
    });

    it('should clear selectedTag with null', async () => {
      mockArticlesModel.selectedTag$.next('old-tag');

      await testRuntime.runPromise(
        Effect.gen(function* () {
          const service = yield* ArticleService;
          yield* service.selectTag(null);
        })
      );

      expect(mockArticlesModel.selectedTag$.getValue()).toBe(null);
    });
  });
});
