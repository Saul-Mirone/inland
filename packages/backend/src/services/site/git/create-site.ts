import { Effect } from 'effect'

import { GitProviderRepository } from '../../../repositories/git-provider-repository'
import { SiteRepository } from '../../../repositories/site-repository'
import { ArticleService } from '../../article-service'
import * as AuthService from '../../auth-service'
import {
  SiteCreationError,
  DuplicateSiteNameError,
  type CreateSiteData,
} from '../site-types'

export const createSite = (data: CreateSiteData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const gitProvider = yield* GitProviderRepository

    try {
      const accessToken = yield* AuthService.getUserAuthToken(data.userId)

      const platformUser = yield* AuthService.fetchUser(accessToken)

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
          siteNameSlug: data.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          siteAuthor: data.author || platformUser.username,
          platformUsername: platformUser.username,
        }
      )

      const site = yield* siteRepo.create({
        userId: data.userId,
        name: data.name,
        gitRepo: gitRepo.fullName,
        platform: 'github',
        deployStatus: 'deployed',
        deployUrl: gitRepo.pagesUrl,
      })

      try {
        const articleService = yield* ArticleService
        const importResult = yield* articleService.importArticlesFromGit(
          site.id,
          data.userId
        )

        yield* Effect.logInfo(
          `Imported ${importResult.imported}/${importResult.total} articles for site ${site.name}`
        )
      } catch (importError) {
        yield* Effect.logError('Failed to import articles from Git repo', {
          importError,
        })
      }

      return {
        ...site,
        gitUrl: gitRepo.htmlUrl,
        pagesUrl: gitRepo.pagesUrl,
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        return yield* new DuplicateSiteNameError({
          name: data.name,
          userId: data.userId,
        })
      }
      return yield* new SiteCreationError({
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })
