import { Effect } from 'effect'

import { SiteRepository } from '../../../repositories/site-repository'

export const findUserSites = (userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    return yield* siteRepo.findByUserIdWithCounts(userId)
  })
