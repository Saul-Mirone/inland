import { Effect } from 'effect'

import { SiteRepository } from '../../../repositories/site-repository'
import { SiteNotFoundError, SiteAccessDeniedError } from '../site-types'

export const findSiteById = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    const site = yield* siteRepo.findByIdWithFullDetails(siteId)

    if (!site) {
      return yield* new SiteNotFoundError({ siteId })
    }

    if (site.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId })
    }

    return site
  })
