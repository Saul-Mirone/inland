import { Effect } from 'effect'

import {
  ArticleRepository,
  type ArticleCreateData,
} from '../../../repositories/article-repository'
import { SiteRepository } from '../../../repositories/site-repository'
import {
  ArticleCreationError,
  DuplicateSlugError,
  SiteAccessError,
  type CreateArticleData,
} from '../article-types'

export const createArticle = (userId: string, data: CreateArticleData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const articleRepo = yield* ArticleRepository

    const site = yield* siteRepo.findByIdWithUserId(data.siteId)

    if (!site) {
      return yield* new SiteAccessError({
        siteId: data.siteId,
        userId,
      })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessError({
        siteId: data.siteId,
        userId,
      })
    }

    try {
      const repoData: ArticleCreateData = {
        siteId: data.siteId,
        title: data.title,
        slug: data.slug,
        content: data.content,
        status: data.status || 'draft',
      }
      const article = yield* articleRepo.create(repoData)
      return article
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return yield* new DuplicateSlugError({
          slug: data.slug,
          siteId: data.siteId,
        })
      }
      return yield* new ArticleCreationError({
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })
