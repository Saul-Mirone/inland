import { Effect } from 'effect';

import {
  ArticleRepository,
  type ArticleCreateData,
} from '../../../repositories/article-repository';
import { GitProviderRepository } from '../../../repositories/git-provider-repository';
import { MediaService } from '../../media';
import { computeContentHash } from '../article-content-hash';
import { validateSiteGitAccess } from './validate-site-git-access';

const logSyncError = (action: string, slug: string) =>
  Effect.catchAll((error: unknown) =>
    Effect.logError(`Failed to ${action} article ${slug}:`, { error })
  );

export const syncArticlesFromGit = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository;
    const gitProvider = yield* GitProviderRepository;

    const { site, gitRepo, accessToken } = yield* validateSiteGitAccess(
      siteId,
      userId
    );

    const repoInfo = yield* gitProvider.getRepositoryInfo(accessToken, gitRepo);

    const remoteArticles = yield* gitProvider.getMarkdownFilesFromRepo(
      accessToken,
      gitRepo,
      repoInfo.defaultBranch
    );

    const dbArticles = yield* articleRepo.findAllForSync(site.id);

    const remoteBySlug = new Map(remoteArticles.map((a) => [a.slug, a]));
    const dbBySlug = new Map(dbArticles.map((a) => [a.slug, a]));

    const created: string[] = [];
    const updated: string[] = [];
    const markedDraft: string[] = [];
    const unchanged: string[] = [];

    for (const [slug, remote] of remoteBySlug) {
      yield* Effect.gen(function* () {
        const existing = dbBySlug.get(slug);

        const hash = computeContentHash(remote);

        if (!existing) {
          const createData: ArticleCreateData = {
            siteId: site.id,
            title: remote.title,
            slug: remote.slug,
            content: remote.content,
            excerpt: remote.excerpt,
            tags: remote.tags,
            status: remote.status,
            ...(remote.date && {
              publishedAt: new Date(remote.date),
            }),
            gitSha: remote.gitSha,
            gitSyncedAt: new Date(),
            contentHash: hash,
            gitSyncedHash: hash,
          };
          yield* articleRepo.create(createData);
          created.push(slug);
        } else if (
          remote.gitSha !== undefined &&
          remote.gitSha !== existing.gitSha
        ) {
          yield* articleRepo.update(existing.id, {
            title: remote.title,
            content: remote.content,
            excerpt: remote.excerpt,
            tags: remote.tags,
            gitSha: remote.gitSha,
            gitSyncedAt: new Date(),
            contentHash: hash,
            gitSyncedHash: hash,
          });
          updated.push(slug);
        } else {
          unchanged.push(slug);
        }
      }).pipe(logSyncError('sync', slug));
    }

    for (const [slug, dbArticle] of dbBySlug) {
      if (!remoteBySlug.has(slug) && dbArticle.status === 'published') {
        yield* articleRepo
          .update(dbArticle.id, {
            status: 'draft',
            gitSha: null,
            gitSyncedAt: new Date(),
          })
          .pipe(logSyncError('mark as draft', slug));
        markedDraft.push(slug);
      }
    }

    const mediaService = yield* MediaService;
    const mediaResult = yield* mediaService
      .importMediaFromGit(siteId, userId)
      .pipe(
        Effect.catchAll((error) =>
          Effect.logError('Failed to sync media', { error }).pipe(
            Effect.map(() => ({ imported: 0, total: 0 }))
          )
        )
      );

    yield* Effect.logInfo(
      `Sync complete for ${gitRepo}: ${created.length} created, ${updated.length} updated, ${markedDraft.length} marked draft, ${unchanged.length} unchanged, ${mediaResult.imported} media imported`
    );

    return {
      created: created.length,
      updated: updated.length,
      markedDraft: markedDraft.length,
      unchanged: unchanged.length,
      total: remoteArticles.length,
      mediaImported: mediaResult.imported,
    };
  });
