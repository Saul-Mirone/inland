import { Effect, Layer, ManagedRuntime, Exit } from 'effect';
import { describe, it, expect, beforeEach } from 'vitest';

import {
  GitProviderRepository,
  type GitProviderRepositoryService,
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
import {
  mockArticle,
  mockGitIntegration,
  mockSite,
} from '../helpers/mock-factories';
import { makeMockGitProvider } from '../helpers/mock-git-provider';
import { TestRedisServiceLayer } from '../helpers/mock-redis';
import { TestRepositoryLayer } from '../helpers/test-layers';

// Default runtime — checkRepoExists returns true
const testRuntime = ManagedRuntime.make(TestRepositoryLayer);

// Runtime with repo deleted — checkRepoExists returns false
const deletedRepoGitProvider: GitProviderRepositoryService = {
  ...makeMockGitProvider(),
  checkRepoExists: () => Effect.succeed(false),
  getMarkdownFilesFromRepo: () => Effect.succeed([]),
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

const DeletedRepoLayer = Layer.mergeAll(
  TestRedisServiceLayer,
  ConfigLayer,
  RepositoryLayer,
  Layer.succeed(GitProviderRepository, deletedRepoGitProvider),
  MockAuthProviderLive,
  MockArticleServiceLive,
  AuthServiceLive,
  MediaServiceLive,
  SessionLayer,
  SiteServiceLive,
  UserServiceLive
);

const deletedRepoRuntime = ManagedRuntime.make(DeletedRepoLayer);

const setupAuthMocks = () => {
  mockPrisma.gitIntegration.findFirst.mockResolvedValue(mockGitIntegration());
};

describe('SiteService', () => {
  beforeEach(() => {
    resetMockPrisma();
  });

  describe('forceSyncSite', () => {
    describe('validation', () => {
      it('should fail when site is not found', async () => {
        mockPrisma.site.findUnique.mockResolvedValue(null);

        const result = await testRuntime.runPromiseExit(
          SiteService.forceSyncSite('missing', 'user-1')
        );

        expect(Exit.isFailure(result)).toBe(true);
      });

      it('should fail when user does not own the site', async () => {
        mockPrisma.site.findUnique.mockResolvedValue(
          mockSite({ userId: 'other-user' })
        );

        const result = await testRuntime.runPromiseExit(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(Exit.isFailure(result)).toBe(true);
      });

      it('should fail when site has no git repo', async () => {
        mockPrisma.site.findUnique.mockResolvedValue(mockSite({ gitRepo: '' }));

        const result = await testRuntime.runPromiseExit(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(Exit.isFailure(result)).toBe(true);
      });
    });

    describe('existing repo', () => {
      it('should force sync all published articles to repo', async () => {
        const site = mockSite();
        const articles = [
          mockArticle({
            id: 'a1',
            slug: 'hello-world',
            status: 'published',
            content: 'Hello content',
            publishedAt: new Date('2025-01-01'),
          }),
          mockArticle({
            id: 'a2',
            slug: 'second-post',
            status: 'published',
            content: 'Second content',
            publishedAt: new Date('2025-02-01'),
          }),
        ];

        mockPrisma.site.findUnique.mockResolvedValue(site);
        setupAuthMocks();
        mockPrisma.article.findMany.mockResolvedValue(articles);
        mockPrisma.article.update.mockResolvedValue({
          ...articles[0],
          gitSha: 'newblobsha789',
          gitSyncedAt: new Date(),
        });

        const result = await testRuntime.runPromise(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(result.repoRecreated).toBe(false);
        expect(result.published).toBe(2);
        expect(result.total).toBe(2);
        expect(result.failed).toBe(0);
      });

      it('should delete orphaned content files from repo', async () => {
        // Remote has 'test-article' (from mock), CMS has no
        // published articles
        mockPrisma.site.findUnique.mockResolvedValue(mockSite());
        setupAuthMocks();
        mockPrisma.article.findMany.mockResolvedValue([]);

        const result = await testRuntime.runPromise(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        // The mock getMarkdownFilesFromRepo returns one article
        // ('test-article') but CMS has none, so it should be
        // deleted
        expect(result.deleted).toBe(1);
        expect(result.published).toBe(0);
      });

      it('should not delete content files that match CMS articles', async () => {
        const articles = [
          mockArticle({
            id: 'a1',
            slug: 'test-article', // same slug as mock remote
            status: 'published',
            content: 'Updated content',
            publishedAt: new Date('2025-01-01'),
          }),
        ];

        mockPrisma.site.findUnique.mockResolvedValue(mockSite());
        setupAuthMocks();
        mockPrisma.article.findMany.mockResolvedValue(articles);
        mockPrisma.article.update.mockResolvedValue({
          ...articles[0],
          gitSha: 'newblobsha789',
          gitSyncedAt: new Date(),
        });

        const result = await testRuntime.runPromise(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(result.deleted).toBe(0);
        expect(result.published).toBe(1);
      });

      it('should update gitSha and gitSyncedAt after publishing', async () => {
        const article = mockArticle({
          id: 'a1',
          slug: 'hello',
          status: 'published',
          content: 'Content',
          publishedAt: new Date(),
        });

        mockPrisma.site.findUnique.mockResolvedValue(mockSite());
        setupAuthMocks();
        mockPrisma.article.findMany.mockResolvedValue([article]);
        mockPrisma.article.update.mockResolvedValue({
          ...article,
          gitSha: 'newblobsha789',
          gitSyncedAt: new Date(),
        });

        await testRuntime.runPromise(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(mockPrisma.article.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'a1' },
            data: expect.objectContaining({
              gitSha: 'newblobsha789',
            }),
          })
        );

        const updateCall = mockPrisma.article.update.mock.calls[0][0];
        expect(updateCall.data.gitSyncedAt).toBeInstanceOf(Date);
      });

      it('should return zero media imported for existing repo', async () => {
        mockPrisma.site.findUnique.mockResolvedValue(mockSite());
        setupAuthMocks();
        mockPrisma.article.findMany.mockResolvedValue([]);

        const result = await testRuntime.runPromise(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(result.mediaImported).toBe(0);
      });
    });

    describe('deleted repo', () => {
      it('should recreate repo and push all articles', async () => {
        const site = mockSite({
          description: 'My blog',
        });
        const articles = [
          mockArticle({
            id: 'a1',
            slug: 'surviving-article',
            status: 'published',
            content: 'Still here',
            publishedAt: new Date('2025-01-01'),
          }),
        ];

        mockPrisma.site.findUnique.mockResolvedValue(site);
        setupAuthMocks();
        mockPrisma.site.update.mockResolvedValue(
          mockSite({ deployStatus: 'deployed' })
        );
        mockPrisma.article.findMany.mockResolvedValue(articles);
        mockPrisma.article.update.mockResolvedValue({
          ...articles[0],
          gitSha: 'newblobsha789',
          gitSyncedAt: new Date(),
        });

        const result = await deletedRepoRuntime.runPromise(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(result.repoRecreated).toBe(true);
        expect(result.published).toBe(1);
        expect(result.failed).toBe(0);
      });

      it('should update site deploy status after recreation', async () => {
        mockPrisma.site.findUnique.mockResolvedValue(mockSite());
        setupAuthMocks();
        mockPrisma.site.update.mockResolvedValue(
          mockSite({ deployStatus: 'deployed' })
        );
        mockPrisma.article.findMany.mockResolvedValue([]);

        await deletedRepoRuntime.runPromise(
          SiteService.forceSyncSite('site-1', 'user-1')
        );

        expect(mockPrisma.site.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'site-1' },
            data: expect.objectContaining({
              deployStatus: 'deployed',
            }),
          })
        );
      });
    });
  });
});
