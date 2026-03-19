import { Effect } from 'effect';

import { ArticleRepository } from '../../../repositories/article-repository';
import {
  ArticleNotFoundError,
  ArticleAccessDeniedError,
} from '../article-types';
import * as ArticleGit from '../git';

export const deleteArticle = (articleId: string, userId: string) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository;

    const existingArticle = yield* articleRepo.findById(articleId);

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId });
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId });
    }

    const article = yield* articleRepo.delete(articleId);

    let gitDeleted = false;
    let gitError: string | null = null;
    const hasGitRepo = Boolean(existingArticle.site.gitRepo);

    if (hasGitRepo && existingArticle.status === 'published') {
      const gitResult = yield* ArticleGit.deleteArticleFromGit(
        existingArticle.id,
        userId
      ).pipe(
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            yield* Effect.logError(
              'Failed to delete article from Git repository',
              { error, articleId, userId }
            );
            return {
              deleted: false,
              reason:
                error instanceof Error ? error.message : 'Unknown Git error',
            };
          })
        )
      );
      gitDeleted = gitResult.deleted;
      if (!gitResult.deleted && gitResult.reason) {
        gitError = gitResult.reason;
      }
    }

    return {
      article: {
        id: article.id,
        siteId: article.siteId,
        title: article.title,
        slug: article.slug,
        content: article.content,
        status: article.status,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      },
      gitDeleted,
      gitError,
      hasGitRepo,
    };
  });
