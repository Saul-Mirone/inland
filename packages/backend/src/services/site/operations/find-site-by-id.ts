import { Effect } from 'effect'

import { SiteRepository } from '../../../repositories/site-repository'
import { SiteNotFoundError } from '../site-types'

export const findSiteById = (siteId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    const site = yield* siteRepo.findByIdWithFullDetails(siteId)

    if (!site) {
      return yield* new SiteNotFoundError({ siteId })
    }

    return site
  })
