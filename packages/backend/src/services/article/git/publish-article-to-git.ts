import { Effect } from 'effect';

import {
  ArticleRepository,
  type ArticleUpdateData,
} from '../../../repositories/article-repository';
import { GitProviderRepository } from '../../../repositories/git-provider-repository';
import { AuthService } from '../../auth';
import { computeContentHash } from '../article-content-hash';
import { buildArticleMarkdown } from '../article-markdown';
import {
  ArticleNotFoundError,
  ArticleAccessDeniedError,
  GitRepositoryError,
  GitConflictError,
} from '../article-types';

export const publishArticleToGit = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository;
    const gitProvider = yield* GitProviderRepository;

    const article = yield* articleRepo.findById(articleId);

    if (!article) {
      return yield* new ArticleNotFoundError({ articleId });
    }

    if (article.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId });
    }

    if (!article.site.gitRepo) {
      return yield* new GitRepositoryError({
        siteId: article.site.id,
        message: 'Site does not have a linked Git repository',
      });
    }

    const authService = yield* AuthService;
    const accessToken = yield* authService.getUserAuthToken(userId);

    if (article.gitSha) {
      const remoteSha = yield* gitProvider.getArticleFileSha(
        accessToken,
        article.site.gitRepo,
        article.slug
      );
      if (remoteSha && remoteSha !== article.gitSha) {
        return yield* new GitConflictError({
          articleId,
          localSha: article.gitSha,
          remoteSha,
        });
      }
    }

    const markdownContent = buildArticleMarkdown(article);

    const result = yield* gitProvider.publishArticleToRepo(
      accessToken,
      article.site.gitRepo,
      article.slug,
      markdownContent
    );

    yield* Effect.logInfo(
      `Article published to Git repository: ${article.title} -> ${result.filePath}`
    );

    const syncedHash = computeContentHash(article);

    const repoData: ArticleUpdateData = {
      status: 'published',
      ...(!article.publishedAt && { publishedAt: new Date() }),
      gitSha: result.blobSha,
      gitSyncedAt: new Date(),
      contentHash: syncedHash,
      gitSyncedHash: syncedHash,
    };
    const updatedArticle = yield* articleRepo.update(articleId, repoData);

    return {
      article: updatedArticle,
      published: result.published,
      filePath: result.filePath,
      commitSha: result.commitSha,
      wasUpdate: result.wasUpdate,
    };
  });
