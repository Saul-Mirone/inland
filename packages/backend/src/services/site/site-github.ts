import { Effect } from 'effect'

import { GitProviderRepository } from '../../repositories/git-provider-repository'
import { SiteRepository } from '../../repositories/site-repository'
import * as ArticleService from '../article'
import * as AuthService from '../auth-service'
import {
  SiteCreationError,
  DuplicateSiteNameError,
  type CreateSiteData,
} from './site-types'

export const createSite = (data: CreateSiteData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository
    const gitProvider = yield* GitProviderRepository

    try {
      // Step 1: Get user's GitHub access token
      const accessToken = yield* AuthService.getUserAuthToken(data.userId)

      // Step 2: Get user's GitHub username for template data
      const githubUser = yield* AuthService.fetchUser(accessToken)

      // Step 3: Create GitHub repository with Pages (always use template)
      const githubRepo = yield* gitProvider.createRepositoryWithPages(
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
          siteAuthor: data.author || githubUser.username,
          platformUsername: githubUser.username,
        }
      )

      // Step 4: Save site to database
      const site = yield* siteRepo.create({
        userId: data.userId,
        name: data.name,
        gitRepo: githubRepo.fullName,
        platform: 'github',
        deployStatus: 'deployed',
        deployUrl: githubRepo.pagesUrl,
      })

      // Step 5: Import existing articles from GitHub repo
      try {
        const importResult = yield* ArticleService.importArticlesFromGit(
          site.id,
          data.userId
        )

        yield* Effect.logInfo(
          `Imported ${importResult.imported}/${importResult.total} articles for site ${site.name}`
        )
      } catch (importError) {
        // Don't fail site creation if import fails, just log the error
        yield* Effect.logError('Failed to import articles from GitHub repo', {
          importError,
        })
      }

      return {
        ...site,
        githubUrl: githubRepo.htmlUrl,
        pagesUrl: githubRepo.pagesUrl,
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
