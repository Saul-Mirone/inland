import { Effect } from 'effect'

import type { PaginationOptions } from '../../../repositories/pagination'

import { ArticleRepository } from '../../../repositories/article-repository'
import { SiteRepository } from '../../../repositories/site-repository'
import { SiteAccessError } from '../article-types'

export const findSiteArticles = (
  siteId: string,
  userId: string,
  pagination?: PaginationOptions
) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const articleRepo = yield* ArticleRepository

    const site = yield* siteRepo.findByIdWithUserId(siteId)

    if (!site) {
      return yield* new SiteAccessError({ siteId, userId })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessError({ siteId, userId })
    }

    return yield* articleRepo.findBySiteId(siteId, pagination)
  })
