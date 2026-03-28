import { Effect } from 'effect';

import {
  ArticleRepository,
  type ArticleUpdateData,
} from '../../../repositories/article-repository';
import { isUniqueConstraintError } from '../../../repositories/repository-error';
import {
  ArticleNotFoundError,
  ArticleUpdateError,
  ArticleAccessDeniedError,
  DuplicateSlugError,
  type UpdateArticleData,
} from '../article-types';
import {
  validateTitle,
  validateSlug,
  normalizeTags,
} from '../article-validation';

export const updateArticle = (
  articleId: string,
  userId: string,
  data: UpdateArticleData
) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository;

    const existingArticle = yield* articleRepo.findById(articleId);

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId });
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId });
    }

    const repoData: ArticleUpdateData = {
      ...(data.title !== undefined && {
        title: yield* validateTitle(data.title),
      }),
      ...(data.slug !== undefined && {
        slug: yield* validateSlug(data.slug),
      }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.excerpt !== undefined && {
        excerpt: data.excerpt,
      }),
      ...(data.tags !== undefined && {
        tags: data.tags ? normalizeTags(data.tags) : data.tags,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.publishedAt !== undefined && {
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      }),
    };

    // Skip update if no fields actually changed to avoid
    // unnecessary updatedAt bumps (e.g. auto-save after publish)
    const isNoop =
      (repoData.title === undefined ||
        repoData.title === existingArticle.title) &&
      (repoData.slug === undefined || repoData.slug === existingArticle.slug) &&
      (repoData.content === undefined ||
        repoData.content === existingArticle.content) &&
      (repoData.excerpt === undefined ||
        repoData.excerpt === existingArticle.excerpt) &&
      (repoData.tags === undefined || repoData.tags === existingArticle.tags) &&
      (repoData.status === undefined ||
        repoData.status === existingArticle.status) &&
      (repoData.publishedAt === undefined ||
        repoData.publishedAt?.getTime() ===
          existingArticle.publishedAt?.getTime());

    if (isNoop) {
      return { article: existingArticle };
    }

    const article = yield* articleRepo.update(articleId, repoData).pipe(
      Effect.catchTag(
        'RepositoryError',
        (
          error
        ): Effect.Effect<never, DuplicateSlugError | ArticleUpdateError> =>
          isUniqueConstraintError(error)
            ? Effect.fail(
                new DuplicateSlugError({
                  slug: data.slug ?? '',
                  siteId: existingArticle.siteId,
                })
              )
            : Effect.fail(
                new ArticleUpdateError({
                  reason:
                    error.cause instanceof Error
                      ? error.cause.message
                      : 'Update failed',
                })
              )
      )
    );
    return { article };
  });
