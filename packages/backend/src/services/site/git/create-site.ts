import { Effect } from 'effect'

import { GitProviderRepository } from '../../../repositories/git-provider-repository'
import { isUniqueConstraintError } from '../../../repositories/repository-error'
import { SiteRepository } from '../../../repositories/site-repository'
import { ArticleService } from '../../article/article-service'
import { AuthService } from '../../auth'
import {
  SiteCreationError,
  DuplicateSiteNameError,
  type CreateSiteData,
} from '../site-types'
import { generateSlug } from '../site-utils'

export const createSite = (data: CreateSiteData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const gitProvider = yield* GitProviderRepository

    const authService = yield* AuthService
    const accessToken = yield* authService.getUserAuthToken(data.userId)

    const platformUser = yield* authService.fetchUser(accessToken)

    const gitRepo = yield* gitProvider.createRepositoryWithPages(
      accessToken,
      {
        name: data.name,
        description: data.description,
        templateOwner: data.templateOwner || 'Saul-Mirone',
        templateRepo: data.templateRepo || 'inland-template-basic',
      },
      {
        siteName: data.name,
        siteDescription: data.description || `Blog site: ${data.name}`,
        siteNameSlug: generateSlug(data.name),
        siteAuthor: data.author || platformUser.username,
        platformUsername: platformUser.username,
      }
    )

    const site = yield* siteRepo
      .create({
        userId: data.userId,
        name: data.name,
        gitRepo: gitRepo.fullName,
        platform: 'github',
        deployStatus: 'deployed',
        deployUrl: gitRepo.pagesUrl,
      })
      .pipe(
        Effect.catchTag(
          'RepositoryError',
          (
            error
          ): Effect.Effect<never, DuplicateSiteNameError | SiteCreationError> =>
            isUniqueConstraintError(error)
              ? Effect.fail(
                  new DuplicateSiteNameError({
                    name: data.name,
                    userId: data.userId,
                  })
                )
              : Effect.fail(
                  new SiteCreationError({
                    reason:
                      error.cause instanceof Error
                        ? error.cause.message
                        : 'Unknown error',
                  })
                )
        )
      )

    yield* Effect.gen(function* () {
      const articleService = yield* ArticleService
      const importResult = yield* articleService.importArticlesFromGit(
        site.id,
        data.userId
      )

      yield* Effect.logInfo(
        `Imported ${importResult.imported}/${importResult.total} articles for site ${site.name}`
      )
    }).pipe(Effect.catchAll(() => Effect.void))

    return {
      ...site,
      gitUrl: gitRepo.htmlUrl,
      pagesUrl: gitRepo.pagesUrl,
    }
  })
