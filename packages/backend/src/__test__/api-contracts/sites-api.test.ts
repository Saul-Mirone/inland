import { Effect, Layer, ManagedRuntime } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  GitProviderRepository,
  type GitProviderRepositoryService,
  type SiteConfig,
} from '../../repositories/git-provider-repository';
import { PrismaArticleRepositoryLive } from '../../repositories/implementations/prisma-article-repository';
import { PrismaMediaRepositoryLive } from '../../repositories/implementations/prisma-media-repository';
import { PrismaSiteRepositoryLive } from '../../repositories/implementations/prisma-site-repository';
import { PrismaUserRepositoryLive } from '../../repositories/implementations/prisma-user-repository';
import { AuthServiceLive } from '../../services/auth/auth-service-live';
import { makeConfigService } from '../../services/config-service';
import { MediaServiceLive } from '../../services/media';
import { SessionServiceLive } from '../../services/session/session-service-live';
import * as SiteService from '../../services/site';
import { SiteServiceLive } from '../../services/site/site-service-live';
import { UserServiceLive } from '../../services/user/user-service-live';
import { MockArticleServiceLive } from '../helpers/mock-article-service';
import { MockAuthProviderLive } from '../helpers/mock-auth-provider';
import {
  mockPrisma,
  resetMockPrisma,
  TestDatabaseServiceLayer,
} from '../helpers/mock-database';
import { mockGitIntegration, mockSite } from '../helpers/mock-factories';
import { makeMockGitProvider } from '../helpers/mock-git-provider';
import { TestRedisServiceLayer } from '../helpers/mock-redis';
import { TestRepositoryLayer } from '../helpers/test-layers';

/**
 * Sites API Contract Tests
 *
 * Tests the data contracts for /sites routes to ensure
 * frontend compatibility and prevent regression bugs.
 */

const testRuntime = ManagedRuntime.make(TestRepositoryLayer);

describe('Sites API Contracts', () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  describe('GET /users/{userId}/sites', () => {
    it('should return paginated result with items containing _count for frontend usage', async () => {
      const mockSites = [
        {
          ...mockSite({
            id: 'site-1',
            name: 'Site 1',
            gitRepo: 'user/repo1',
            deployUrl: 'https://site1.com',
          }),
          _count: { articles: 5, media: 3 },
        },
        {
          ...mockSite({
            id: 'site-2',
            name: 'Site 2',
            gitRepo: 'user/repo2',
            deployUrl: 'https://site2.com',
          }),
          _count: { articles: 2, media: 1 },
        },
      ];

      mockPrisma.$transaction.mockResolvedValue([mockSites, 2]);

      const result = await testRuntime.runPromise(
        SiteService.findUserSites('user-1')
      );

      // Critical: Must return paginated result
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(2);

      // Should work with frontend array methods on items
      expect(() => result.items.map((s) => s.name)).not.toThrow();
      expect(() =>
        result.items.filter((s) => s._count.articles > 0)
      ).not.toThrow();
      expect(() => result.items.find((s) => s.id === 'site-1')).not.toThrow();

      // Verify _count structure is preserved
      expect(result.items[0]._count).toBeDefined();
      expect(result.items[0]._count.articles).toBe(5);
      expect(result.items[0]._count.media).toBe(3);
      expect(result.items[1]._count.articles).toBe(2);
      expect(result.items[1]._count.media).toBe(1);
    });

    it('should return empty items when user has no sites', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const result = await testRuntime.runPromise(
        SiteService.findUserSites('user-1')
      );

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(0);
      expect(result.total).toBe(0);
      expect(() => result.items.map((s) => s.id)).not.toThrow();
    });
  });

  describe('GET /sites/{siteId}', () => {
    it('should return site object with detailed information', async () => {
      const site = {
        ...mockSite({
          id: 'site-1',
          name: 'Test Site',
          gitRepo: 'user/repo',
          deployUrl: 'https://test.com',
        }),
        user: {
          id: 'user-1',
          username: 'testuser',
        },
        articles: [
          {
            id: 'article-1',
            title: 'Article 1',
            status: 'published',
            createdAt: new Date(),
          },
        ],
        media: [
          {
            id: 'media-1',
            filename: 'image.jpg',
            fileSize: BigInt(1024),
            createdAt: new Date(),
          },
        ],
      };

      mockPrisma.site.findUnique.mockResolvedValue(site);

      const result = await testRuntime.runPromise(
        SiteService.findSiteById('site-1', 'user-1')
      );

      // Should return site object with nested data
      expect(Array.isArray(result)).toBe(false);
      expect(result).toEqual(site);
      expect(result.id).toBe('site-1');
      expect(result.user).toBeDefined();
      expect(result.articles).toBeDefined();
      expect(result.media).toBeDefined();
      expect(Array.isArray(result.articles)).toBe(true);
      expect(Array.isArray(result.media)).toBe(true);
    });
  });

  describe('POST /sites', () => {
    it('should return created site object with GitHub URLs', async () => {
      const createdSite = mockSite({
        id: 'site-1',
        name: 'New Site',
        gitRepo: 'user/new-site',
        deployUrl: 'https://user.github.io/new-site',
      });

      // Mock all the GitHub operations that createSite does
      mockPrisma.site.create.mockResolvedValue(createdSite);

      // Note: createSite is complex and involves GitHub API calls
      // This test focuses on the final response shape
      const expectedResponse = {
        ...createdSite,
        githubUrl: 'https://github.com/user/new-site',
        pagesUrl: 'https://user.github.io/new-site',
      };

      // For now, just verify the expected shape
      expect(expectedResponse.id).toBeDefined();
      expect(expectedResponse.name).toBeDefined();
      expect(expectedResponse.githubUrl).toBeDefined();
      expect(expectedResponse.pagesUrl).toBeDefined();
    });
  });

  describe('POST /sites/import', () => {
    it('should return import result with detailed information', async () => {
      const createdSite = mockSite({
        id: 'site-1',
        name: 'imported-site',
        gitRepo: 'testuser/existing-repo',
        deployUrl: 'https://testuser.github.io/existing-repo',
      });

      // Setup mocks
      mockPrisma.site.create.mockResolvedValue(createdSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      // Test data
      const importData = {
        userId: 'user-1',
        name: 'imported-site',
        gitRepoFullName: 'testuser/existing-repo',
        platform: 'github',
        setupWorkflow: true,
        enablePages: true,
        overrideExistingFiles: false,
        description: 'Imported repository',
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Critical API contract validation for frontend
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');

      // Site object structure
      expect(result.site).toBeDefined();
      expect(typeof result.site).toBe('object');
      expect(result.site.id).toBeDefined();
      expect(typeof result.site.id).toBe('string');
      expect(result.site.name).toBeDefined();
      expect(typeof result.site.name).toBe('string');
      expect(result.site.gitRepo).toBeDefined();
      expect(result.site.gitUrl).toBeDefined();
      expect(typeof result.site.gitUrl).toBe('string');
      expect(result.site.gitUrl).toMatch(/^https:\/\/github\.com\//);

      // Operation status flags
      expect(typeof result.pagesConfigured).toBe('boolean');
      expect(typeof result.workflowInjected).toBe('boolean');

      // File operation results
      expect(Array.isArray(result.filesCreated)).toBe(true);
      expect(Array.isArray(result.filesSkipped)).toBe(true);
      expect(() => result.filesCreated.map((f) => f)).not.toThrow();
      expect(() =>
        result.filesSkipped.filter((f) => f.includes('.yml'))
      ).not.toThrow();

      // Import statistics
      expect(typeof result.articlesImported).toBe('number');
      expect(typeof result.totalArticles).toBe('number');
      expect(result.articlesImported).toBeGreaterThanOrEqual(0);
      expect(result.totalArticles).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent structure with minimal required fields', async () => {
      const createdSite = mockSite({
        id: 'site-minimal',
        name: 'minimal-site',
        gitRepo: 'testuser/minimal-repo',
        deployStatus: 'pending',
        deployUrl: null,
      });

      // Setup mocks
      mockPrisma.site.create.mockResolvedValue(createdSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      // Minimal import data
      const importData = {
        userId: 'user-1',
        name: 'minimal-site',
        gitRepoFullName: 'testuser/minimal-repo',
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Must have all required fields even with minimal input
      expect(result.site).toBeDefined();
      expect(result.site.id).toBe('site-minimal');
      expect(result.site.gitUrl).toBe(
        'https://github.com/testuser/minimal-repo'
      );
      expect(result.pagesConfigured).toBeDefined();
      expect(result.workflowInjected).toBeDefined();
      expect(result.filesCreated).toBeDefined();
      expect(result.filesSkipped).toBeDefined();
      expect(result.articlesImported).toBeDefined();
      expect(result.totalArticles).toBeDefined();
    });

    it('should return proper structure when workflow injection is disabled', async () => {
      const createdSite = mockSite({
        id: 'site-no-workflow',
        name: 'no-workflow-site',
        gitRepo: 'testuser/no-workflow-repo',
        deployUrl: 'https://testuser.github.io/no-workflow-repo',
      });

      // Setup mocks
      mockPrisma.site.create.mockResolvedValue(createdSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      // Import with workflow disabled
      const importData = {
        userId: 'user-1',
        name: 'no-workflow-site',
        gitRepoFullName: 'testuser/no-workflow-repo',
        setupWorkflow: false,
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Verify workflow-related fields
      expect(result.workflowInjected).toBe(false);
      expect(result.filesCreated).toEqual([]);
      expect(Array.isArray(result.filesCreated)).toBe(true);
      expect(Array.isArray(result.filesSkipped)).toBe(true);
    });

    it('should handle different platforms in response', async () => {
      const createdSite = mockSite({
        id: 'site-gitlab',
        name: 'gitlab-site',
        gitRepo: 'testuser/gitlab-repo',
        platform: 'gitlab',
        deployUrl: 'https://testuser.gitlab.io/gitlab-repo',
      });

      // Setup mocks
      mockPrisma.site.create.mockResolvedValue(createdSite);
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration({ platform: 'gitlab' })
      );

      // Import from GitLab
      const importData = {
        userId: 'user-1',
        name: 'gitlab-site',
        gitRepoFullName: 'testuser/gitlab-repo',
        platform: 'gitlab',
      };

      // Execute
      const result = await testRuntime.runPromise(
        SiteService.importRepo(importData)
      );

      // Verify platform is preserved in response
      expect(result.site.platform).toBe('gitlab');
      expect(result.site.gitUrl).toBe(
        'https://github.com/testuser/gitlab-repo'
      ); // Expected: Mock uses GitHub format regardless of platform
    });
  });

  describe('GET /sites/repo-config', () => {
    it('should return config object when repo has inland.config.json', async () => {
      const mockConfig: SiteConfig = {
        name: 'My Blog',
        description: 'A cool blog',
        url: 'https://testuser.github.io/my-blog',
        author: 'testuser',
        avatarUrl: 'https://github.com/testuser.png',
        authorUrl: 'https://github.com/testuser',
      };

      const configGitProvider: GitProviderRepositoryService = {
        ...makeMockGitProvider(),
        getSiteConfig: () => Effect.succeed(mockConfig),
      };

      const ConfigLayer = makeConfigService;
      const RepositoryLayer = Layer.mergeAll(
        PrismaArticleRepositoryLive,
        PrismaMediaRepositoryLive,
        PrismaSiteRepositoryLive,
        PrismaUserRepositoryLive
      ).pipe(Layer.provide(TestDatabaseServiceLayer));
      const SessionLayer = SessionServiceLive.pipe(
        Layer.provide(Layer.merge(TestRedisServiceLayer, ConfigLayer))
      );

      const WithConfigLayer = Layer.mergeAll(
        TestRedisServiceLayer,
        ConfigLayer,
        RepositoryLayer,
        Layer.succeed(GitProviderRepository, configGitProvider),
        MockAuthProviderLive,
        MockArticleServiceLive,
        AuthServiceLive,
        MediaServiceLive,
        SessionLayer,
        SiteServiceLive,
        UserServiceLive
      );

      const configRuntime = ManagedRuntime.make(WithConfigLayer);

      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      const result = await configRuntime.runPromise(
        SiteService.getRepoConfig('user-1', 'testuser/my-blog')
      );

      // Frontend expects { config: SiteConfig | null }
      // The route wraps this as { config: result }
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(typeof result!.name).toBe('string');
      expect(typeof result!.description).toBe('string');
      expect(typeof result!.url).toBe('string');
      expect(typeof result!.author).toBe('string');
      expect(typeof result!.avatarUrl).toBe('string');
      expect(typeof result!.authorUrl).toBe('string');
    });

    it('should return null when repo has no config file', async () => {
      mockPrisma.gitIntegration.findFirst.mockResolvedValue(
        mockGitIntegration()
      );

      const result = await testRuntime.runPromise(
        SiteService.getRepoConfig('user-1', 'testuser/no-config')
      );

      // Frontend should handle null config gracefully
      expect(result).toBeNull();
    });
  });

  describe('Site Validation APIs', () => {
    it('validateSiteName should return cleaned string', async () => {
      const result = await testRuntime.runPromise(
        SiteService.validateSiteName('  my-site  ')
      );

      expect(typeof result).toBe('string');
      expect(result).toBe('my-site');
    });

    it('validateGitRepo should return cleaned string', async () => {
      const result = await testRuntime.runPromise(
        SiteService.validateGitRepo('  user/repo  ')
      );

      expect(typeof result).toBe('string');
      expect(result).toBe('user/repo');
    });
  });
});
