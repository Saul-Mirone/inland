import { Effect } from 'effect'

import { ArticleRepository } from '../../../repositories/article-repository'
import { SiteRepository } from '../../../repositories/site-repository'
import { SiteAccessError } from '../article-types'

export const findSiteArticles = (siteId: string, userId: string) =>
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

    const articles = yield* articleRepo.findBySiteId(siteId)
    return articles
  })
