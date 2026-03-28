import { ManagedRuntime, Exit } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import { deleteArticleFromGit } from '../../services/article/git/delete-article-from-git';
import { importArticlesFromGit } from '../../services/article/git/import-articles-from-git';
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
    mockPrisma.article.update.mockResolvedValue(
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

describe('importArticlesFromGit', () => {
  beforeEach(() => {
    resetMockPrisma();
    mockPrisma.gitIntegration.findFirst.mockResolvedValue(mockGitIntegration());
  });

  it('should import new articles from repository', async () => {
    mockPrisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'user-1',
      gitRepo: 'testuser/test-repo',
    } as never);
    // No existing article with same slug
    mockPrisma.article.findFirst.mockResolvedValue(null);
    mockPrisma.article.create.mockResolvedValue(
      mockArticleWithSite({
        slug: 'test-article',
        status: 'published',
        gitSha: 'abc123blobsha',
      })
    );

    const result = await testRuntime.runPromise(
      importArticlesFromGit('site-1', 'user-1')
    );

    expect(result.imported).toBe(1);
    expect(result.total).toBe(1);
    expect(mockPrisma.article.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          siteId: 'site-1',
          slug: 'test-article',
          gitSha: 'abc123blobsha',
        }),
      })
    );
  });

  it('should skip existing articles', async () => {
    mockPrisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'user-1',
      gitRepo: 'testuser/test-repo',
    } as never);
    // Article already exists
    mockPrisma.article.findFirst.mockResolvedValue(
      mockArticle({ slug: 'test-article' })
    );

    const result = await testRuntime.runPromise(
      importArticlesFromGit('site-1', 'user-1')
    );

    expect(result.imported).toBe(0);
    expect(result.total).toBe(1);
    expect(mockPrisma.article.create).not.toHaveBeenCalled();
  });

  it('should fail when site not found', async () => {
    mockPrisma.site.findUnique.mockResolvedValue(null);

    const result = await testRuntime.runPromiseExit(
      importArticlesFromGit('missing', 'user-1')
    );

    expect(Exit.isFailure(result)).toBe(true);
  });

  it('should fail when site has no git repo', async () => {
    mockPrisma.site.findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'user-1',
      gitRepo: null,
    } as never);

    const result = await testRuntime.runPromiseExit(
      importArticlesFromGit('site-1', 'user-1')
    );

    expect(Exit.isFailure(result)).toBe(true);
  });
});

describe('deleteArticleFromGit', () => {
  beforeEach(() => {
    resetMockPrisma();
    mockPrisma.gitIntegration.findFirst.mockResolvedValue(mockGitIntegration());
  });

  it('should delete article file from git repository', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(
      mockArticleWithSite({
        id: 'article-1',
        slug: 'test-article',
        status: 'published',
      })
    );

    const result = await testRuntime.runPromise(
      deleteArticleFromGit('article-1', 'user-1')
    );

    expect(result.deleted).toBe(true);
    expect(result.filePath).toBe('content/test-article.md');
  });

  it('should return not deleted when site has no git repo', async () => {
    mockPrisma.article.findUnique.mockResolvedValue({
      ...mockArticle({ id: 'article-1' }),
      site: {
        id: 'site-1',
        name: 'Test Site',
        userId: 'user-1',
        gitRepo: null,
      },
    } as never);

    const result = await testRuntime.runPromise(
      deleteArticleFromGit('article-1', 'user-1')
    );

    expect(result.deleted).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('should fail when article not found', async () => {
    mockPrisma.article.findUnique.mockResolvedValue(null);

    const result = await testRuntime.runPromiseExit(
      deleteArticleFromGit('missing', 'user-1')
    );

    expect(Exit.isFailure(result)).toBe(true);
  });

  it('should fail when user does not own article', async () => {
    mockPrisma.article.findUnique.mockResolvedValue({
      ...mockArticle({ id: 'article-1' }),
      site: {
        id: 'site-1',
        name: 'Test Site',
        userId: 'other-user',
        gitRepo: 'user/repo',
      },
    } as never);

    const result = await testRuntime.runPromiseExit(
      deleteArticleFromGit('article-1', 'user-1')
    );

    expect(Exit.isFailure(result)).toBe(true);
  });
});
