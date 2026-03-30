import { Effect } from 'effect';

import type { SiteConfig } from '../../../repositories/git-provider-repository';

import { ArticleRepository } from '../../../repositories/article-repository';
import { GitProviderRepository } from '../../../repositories/git-provider-repository';
import { SiteRepository } from '../../../repositories/site-repository';
import { computeContentHash } from '../../article/article-content-hash';
import { buildArticleMarkdown } from '../../article/article-markdown';
import { GitRepositoryError } from '../../article/article-types';
import { AuthService } from '../../auth';
import { MediaService } from '../../media';
import { SiteNotFoundError, SiteAccessDeniedError } from '../site-types';
import { generateSlug, resolveDisplayName } from '../site-utils';

export const forceSyncSite = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const gitProvider = yield* GitProviderRepository;
    const articleRepo = yield* ArticleRepository;
    const siteRepo = yield* SiteRepository;
    const authService = yield* AuthService;

    const site = yield* siteRepo.findById(siteId);

    if (!site) {
      return yield* new SiteNotFoundError({ siteId });
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId });
    }

    const gitRepo = site.gitRepo;
    if (!gitRepo) {
      return yield* new GitRepositoryError({
        siteId,
        message: 'Site does not have a linked Git repository',
      });
    }

    const accessToken = yield* authService.getUserAuthToken(userId);
    const platformUser = yield* authService.fetchUser(accessToken);

    const siteDisplayInfo = {
      name: site.name,
      displayName: site.displayName ?? undefined,
    };

    const repoExists = yield* gitProvider.checkRepoExists(accessToken, gitRepo);

    let repoRecreated = false;

    if (!repoExists) {
      yield* Effect.logInfo(`Repository ${gitRepo} not found, recreating...`);

      const [, repoName] = gitRepo.split('/');

      const newRepo = yield* gitProvider.createRepositoryWithPages(
        accessToken,
        {
          name: repoName,
          description: site.description ?? `Blog site: ${site.name}`,
          templateOwner: 'Saul-Mirone',
          templateRepo: 'inland-template-basic',
        },
        {
          siteName: resolveDisplayName(siteDisplayInfo),
          siteDescription: site.description ?? `Blog site: ${site.name}`,
          siteNameSlug: generateSlug(site.name),
          siteAuthor: platformUser.displayName ?? platformUser.username,
          platformUsername: platformUser.username,
        }
      );

      yield* siteRepo
        .update(siteId, {
          deployStatus: 'deployed',
          ...(newRepo.pagesUrl !== undefined && {
            deployUrl: newRepo.pagesUrl,
          }),
        })
        .pipe(
          Effect.catchTag('RepositoryError', (error) =>
            Effect.logError(
              'Failed to update site deploy status after repo recreation',
              { error }
            )
          )
        );

      repoRecreated = true;

      yield* Effect.logInfo(`Repository ${gitRepo} recreated successfully`);
    } else {
      yield* gitProvider
        .injectInlandWorkflow(
          accessToken,
          gitRepo,
          {
            siteName: resolveDisplayName(siteDisplayInfo),
            siteDescription: site.description ?? `Blog site: ${site.name}`,
            siteNameSlug: generateSlug(site.name),
            siteAuthor: platformUser.displayName ?? platformUser.username,
            platformUsername: platformUser.username,
          },
          { overrideExistingFiles: true }
        )
        .pipe(
          Effect.catchAll((error) =>
            Effect.logError(
              'Failed to inject workflow files during force sync',
              { error }
            )
          )
        );
    }

    // Push site config
    const [owner, repoName] = gitRepo.split('/');
    const siteConfig: SiteConfig = {
      name: resolveDisplayName(siteDisplayInfo),
      description: site.description ?? '',
      url: `https://${owner}.github.io/${repoName}`,
      author: platformUser.displayName ?? platformUser.username,
      avatarUrl: `https://github.com/${platformUser.username}.png`,
      authorUrl: `https://github.com/${platformUser.username}`,
    };

    yield* gitProvider.pushSiteConfig(accessToken, gitRepo, siteConfig).pipe(
      Effect.catchAll((error) =>
        Effect.logError('Failed to push site config during force sync', {
          error,
        })
      )
    );

    // Get remote content files to detect orphans
    const repoInfo = yield* gitProvider.getRepositoryInfo(accessToken, gitRepo);
    const remoteArticles = yield* gitProvider
      .getMarkdownFilesFromRepo(accessToken, gitRepo, repoInfo.defaultBranch)
      .pipe(Effect.catchAll(() => Effect.succeed([])));

    const remoteSlugs = new Set(remoteArticles.map((a) => a.slug));

    // Fetch all published articles from CMS
    const publishedArticles =
      yield* articleRepo.findAllPublishedBySiteId(siteId);

    const publishedSlugs = new Set(publishedArticles.map((a) => a.slug));

    // Delete content files that are not in CMS
    const deleted: string[] = [];
    for (const remoteSlug of remoteSlugs) {
      if (!publishedSlugs.has(remoteSlug)) {
        yield* gitProvider
          .deleteArticleFromRepo(accessToken, gitRepo, remoteSlug)
          .pipe(
            Effect.tap(() => {
              deleted.push(remoteSlug);
              return Effect.void;
            }),
            Effect.catchAll((error) =>
              Effect.logError(
                `Failed to delete orphaned article ${remoteSlug}`,
                { error }
              )
            )
          );
      }
    }

    // Force publish all CMS articles to repo
    const published: string[] = [];
    const failed: string[] = [];

    for (const article of publishedArticles) {
      yield* Effect.gen(function* () {
        const markdown = buildArticleMarkdown(article);
        const result = yield* gitProvider.publishArticleToRepo(
          accessToken,
          gitRepo,
          article.slug,
          markdown
        );

        const syncedHash = computeContentHash(article);

        yield* articleRepo
          .update(article.id, {
            gitSha: result.blobSha,
            gitSyncedAt: new Date(),
            contentHash: syncedHash,
            gitSyncedHash: syncedHash,
          })
          .pipe(
            Effect.catchTag('RepositoryError', (error) =>
              Effect.logError(
                `Failed to update gitSha for article ${article.slug}`,
                { error }
              )
            )
          );

        published.push(article.slug);
      }).pipe(
        Effect.catchAll((error) => {
          failed.push(article.slug);
          return Effect.logError(
            `Failed to force publish article ${article.slug}`,
            { error }
          );
        })
      );
    }

    // Re-import media for recreated repos
    let mediaImported = 0;
    if (repoRecreated) {
      const mediaService = yield* MediaService;
      const mediaResult = yield* mediaService
        .importMediaFromGit(siteId, userId)
        .pipe(
          Effect.catchAll((error) =>
            Effect.logError('Failed to import media during force sync', {
              error,
            }).pipe(Effect.map(() => ({ imported: 0, total: 0 })))
          )
        );
      mediaImported = mediaResult.imported;
    }

    yield* Effect.logInfo(
      `Force sync complete for ${gitRepo}: ${published.length} published, ${deleted.length} deleted, ${failed.length} failed, repoRecreated=${repoRecreated}`
    );

    return {
      repoRecreated,
      published: published.length,
      deleted: deleted.length,
      failed: failed.length,
      mediaImported,
      total: publishedArticles.length,
    };
  });
