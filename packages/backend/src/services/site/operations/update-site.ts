import { Effect } from 'effect'

import { isUniqueConstraintError } from '../../../repositories/repository-error'
import { SiteRepository } from '../../../repositories/site-repository'
import {
  SiteNotFoundError,
  SiteUpdateError,
  SiteAccessDeniedError,
  DuplicateSiteNameError,
  type UpdateSiteData,
} from '../site-types'

export const updateSite = (
  siteId: string,
  userId: string,
  data: UpdateSiteData
) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    const existingSite = yield* siteRepo.findByIdWithUserId(siteId)

    if (!existingSite) {
      return yield* new SiteNotFoundError({ siteId })
    }

    if (existingSite.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId })
    }

    const updatedSite = yield* siteRepo.update(siteId, data).pipe(
      Effect.catchTag(
        'RepositoryError',
        (
          error
        ): Effect.Effect<never, DuplicateSiteNameError | SiteUpdateError> =>
          isUniqueConstraintError(error)
            ? Effect.fail(
                new DuplicateSiteNameError({
                  name: data.name ?? '',
                  userId,
                })
              )
            : Effect.fail(
                new SiteUpdateError({
                  reason:
                    error.cause instanceof Error
                      ? error.cause.message
                      : 'Update failed',
                })
              )
      )
    )
    return updatedSite
  })
