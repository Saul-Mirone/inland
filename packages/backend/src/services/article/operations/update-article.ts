import { Effect } from 'effect'

import {
  ArticleRepository,
  type ArticleUpdateData,
} from '../../../repositories/article-repository'
import {
  ArticleNotFoundError,
  ArticleCreationError,
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

    try {
      const repoData: ArticleUpdateData = {
        ...(data.title && { title: data.title }),
        ...(data.slug && { slug: data.slug }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.status && { status: data.status }),
      }
      const article = yield* articleRepo.update(articleId, repoData)
      return { article }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return yield* new DuplicateSlugError({
          slug: data.slug || '',
          siteId: existingArticle.siteId,
        })
      }
      return yield* new ArticleCreationError({
        reason: error instanceof Error ? error.message : 'Update failed',
      })
    }
  })
