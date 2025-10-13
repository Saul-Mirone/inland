import { Effect } from 'effect'

import { SiteRepository } from '../../../repositories/site-repository'
import { SiteNotFoundError, SiteAccessDeniedError } from '../site-types'

export const deleteSite = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    const existingSite = yield* siteRepo.findByIdWithUserId(siteId)

    if (!existingSite) {
      return yield* new SiteNotFoundError({ siteId })
    }

    if (existingSite.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId })
    }

    const deletedSite = yield* siteRepo.delete(siteId)
    return deletedSite
  })
