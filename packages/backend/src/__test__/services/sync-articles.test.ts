import { ManagedRuntime, Exit } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import { publishArticleToGit } from '../../services/article/git/publish-article-to-git';
import { syncArticlesFromGit } from '../../services/article/git/sync-articles-from-git';
import { mockPrisma, resetMockPrisma } from '../helpers/mock-database';
import {
  mockArticle,
  mockGitIntegration,
  mockSite,
} from '../helpers/mock-factories';
import { TestRepositoryLayer } from '../helpers/test-layers';

const testRuntime = ManagedRuntime.make(TestRepositoryLayer);

const mockArticleWithSite = (
  overrides: Parameters<typeof mockArticle>[0] = {}
) => ({
  ...mockArticle(overrides),
  site: {
    id: 'site-1',
    name: 'Test Site',
    userId: 'user-1',
    gitRepo: 'testuser/test-repo',
  },
});

describe('syncArticlesFromGit', () => {
  beforeEach(() => {
    resetMockPrisma();
    mockPrisma.gitIntegration.findFirst.mockResolvedValue(mockGitIntegration());
  });

  it('should create new articles from repo', async () => {
    mockPrisma.site.findUnique.mockResolvedValue(
      mockSite({ id: 'site-1', userId: 'user-1' })
    );
    mockPrisma.article.findMany.mockResolvedValue([]);
    mockPrisma.article.create.mockResolvedValue(
      mockArticleWithSite({
        slug: 'test-article',
        status: 'published',
        gitSha: 'abc123blobsha',
      })
    );

    const result = await testRuntime.runPromise(
      syncArticlesFromGit('site-1', 'user-1')
    );

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.markedDraft).toBe(0);
    expect(mockPrisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: 'test-article',
          gitSha: 'abc123blobsha',
        }),
      })
    );
  });

  it('should update articles with different SHA', async () => {
    mockPrisma.site.findUnique.mockResolvedValue(
      mockSite({ id: 'site-1', userId: 'user-1' })
    );
    mockPrisma.article.findMany.mockResolvedValue([
      mockArticle({
        id: 'article-1',
        slug: 'test-article',
        status: 'published',
        gitSha: 'old-sha',
      }),
    ]);
    mockPrisma.article.update.mockResolvedValue(
      mockArticleWithSite({
        id: 'article-1',
        slug: 'test-article',
        gitSha: 'abc123blobsha',
      })
    );

    const result = await testRuntime.runPromise(
      syncArticlesFromGit('site-1', 'user-1')
    );

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          gitSha: 'abc123blobsha',
        }),
      })
    );
  });

  it('should skip unchanged articles', async () => {
    mockPrisma.site.findUnique.mockResolvedValue(
      mockSite({ id: 'site-1', userId: 'user-1' })
    );
    mockPrisma.article.findMany.mockResolvedValue([
      mockArticle({
        id: 'article-1',
        slug: 'test-article',
        status: 'published',
        gitSha: 'abc123blobsha',
      }),
    ]);

    const result = await testRuntime.runPromise(
      syncArticlesFromGit('site-1', 'user-1')
    );

    expect(result.unchanged).toBe(1);
    expect(result.created).toBe(0);
    expect(result.updated).toBe(0);
    expect(mockPrisma.article.update).not.toHaveBeenCalled();
    expect(mockPrisma.article.create).not.toHaveBeenCalled();
  });

  it('should mark deleted remote articles as draft', async () => {
    mockPrisma.site.findUnique.mockResolvedValue(
      mockSite({ id: 'site-1', userId: 'user-1' })
    );
    mockPrisma.article.findMany.mockResolvedValue([
      mockArticle({
        id: 'article-extra',
        slug: 'deleted-remotely',
        status: 'published',
        gitSha: 'some-sha',
      }),
      mockArticle({
        id: 'article-1',
        slug: 'test-article',
        status: 'published',
        gitSha: 'abc123blobsha',
      }),
    ]);
    mockPrisma.article.update.mockResolvedValue(
      mockArticleWithSite({
        id: 'article-extra',
        slug: 'deleted-remotely',
        status: 'draft',
        gitSha: null,
      })
    );

    const result = await testRuntime.runPromise(
      syncArticlesFromGit('site-1', 'user-1')
    );

    expect(result.markedDraft).toBe(1);
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'article-extra' },
        data: expect.objectContaining({
          status: 'draft',
          gitSha: null,
        }),
      })
    );
  });

  it('should fail when user does not own the site', async () => {
    mockPrisma.site.findUnique.mockResolvedValue(
      mockSite({ userId: 'other-user' })
    );

    const result = await testRuntime.runPromiseExit(
      syncArticlesFromGit('site-1', 'user-1')
    );

    expect(Exit.isFailure(result)).toBe(true);
  });

  it('should fail when site has no git repo', async () => {
    mockPrisma.site.findUnique.mockResolvedValue(mockSite({ gitRepo: '' }));

    const result = await testRuntime.runPromiseExit(
      syncArticlesFromGit('site-1', 'user-1')
    );

    expect(Exit.isFailure(result)).toBe(true);
  });
});

describe('publishArticleToGit - conflict detection', () => {
  beforeEach(() => {
    resetMockPrisma();
    mockPrisma.gitIntegration.findFirst.mockResolvedValue(mockGitIntegration());
  });

  it('should save gitSha after successful publish', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(
      mockArticleWithSite({
        id: 'article-1',
        status: 'draft',
        gitSha: null,
      })
    );
    mockPrisma.article.update.mockResolvedValue(
      mockArticleWithSite({
        id: 'article-1',
        status: 'published',
        gitSha: 'newblobsha789',
      })
    );

    const result = await testRuntime.runPromise(
      publishArticleToGit('article-1', 'user-1')
    );

    expect(result.published).toBe(true);
    expect(mockPrisma.article.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'published',
          gitSha: 'newblobsha789',
        }),
      })
    );
  });

  it('should fail with conflict when remote SHA differs', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(
      mockArticleWithSite({
        id: 'article-1',
        status: 'published',
        gitSha: 'local-sha-different',
      })
    );

    const result = await testRuntime.runPromiseExit(
      publishArticleToGit('article-1', 'user-1')
    );

    expect(Exit.isFailure(result)).toBe(true);
    expect(mockPrisma.article.update).not.toHaveBeenCalled();
  });
});
