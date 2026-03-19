import { Effect } from 'effect'

import {
  ArticleRepository,
  type ArticleUpdateData,
} from '../../../repositories/article-repository'
import { isUniqueConstraintError } from '../../../repositories/repository-error'
import {
  ArticleNotFoundError,
  ArticleUpdateError,
  ArticleAccessDeniedError,
  DuplicateSlugError,
  type UpdateArticleData,
} from '../article-types'

export const updateArticle = (
  articleId: string,
  userId: string,
  data: UpdateArticleData
) =>
  Effect.gen(function* () {
    const articleRepo = yield* ArticleRepository

    const existingArticle = yield* articleRepo.findById(articleId)

    if (!existingArticle) {
      return yield* new ArticleNotFoundError({ articleId })
    }

    if (existingArticle.site.userId !== userId) {
      return yield* new ArticleAccessDeniedError({ articleId, userId })
    }

    const repoData: ArticleUpdateData = {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.status !== undefined && { status: data.status }),
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
    )
    return { article }
  })
