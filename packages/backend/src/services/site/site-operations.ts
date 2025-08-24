import { Effect } from 'effect'

import { SiteRepository } from '../../repositories/site-repository'
import {
  SiteNotFoundError,
  SiteCreationError,
  SiteAccessDeniedError,
  DuplicateSiteNameError,
  type UpdateSiteData,
} from './site-types'

export const findSiteById = (siteId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    const site = yield* siteRepo.findByIdWithFullDetails(siteId)

    if (!site) {
      return yield* new SiteNotFoundError({ siteId })
    }

    return site
  })

export const findUserSites = (userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    return yield* siteRepo.findByUserIdWithCounts(userId)
  })

export const updateSite = (
  siteId: string,
  userId: string,
  data: UpdateSiteData
) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    // First check if site exists and user has access
    const existingSite = yield* siteRepo.findByIdWithUserId(siteId)

    if (!existingSite) {
      return yield* new SiteNotFoundError({ siteId })
    }

    if (existingSite.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId })
    }

    try {
      const updatedSite = yield* siteRepo.update(siteId, data)
      return updatedSite
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return yield* new DuplicateSiteNameError({
          name: data.name || '',
          userId,
        })
      }
      return yield* new SiteCreationError({
        reason: error instanceof Error ? error.message : 'Update failed',
      })
    }
  })

export const deleteSite = (siteId: string, userId: string) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    // First check if site exists and user has access
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
