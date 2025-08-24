import { Effect, Data } from 'effect'

import { SiteRepository } from '../repositories/site-repository'
import * as ArticleService from './article'
import * as AuthService from './auth-service'
import * as GitHubService from './github-service'

export class SiteNotFoundError extends Data.TaggedError('SiteNotFoundError')<{
  readonly siteId: string
}> {}

export class SiteCreationError extends Data.TaggedError('SiteCreationError')<{
  readonly reason: string
}> {}

export class SiteAccessDeniedError extends Data.TaggedError(
  'SiteAccessDeniedError'
)<{
  readonly siteId: string
  readonly userId: string
}> {}

export class DuplicateSiteNameError extends Data.TaggedError(
  'DuplicateSiteNameError'
)<{
  readonly name: string
  readonly userId: string
}> {}

export interface CreateSiteData {
  readonly userId: string
  readonly name: string
  readonly description?: string
  readonly author?: string
  readonly templateOwner?: string
  readonly templateRepo?: string
}

export interface UpdateSiteData {
  readonly name?: string
  readonly gitRepo?: string
  readonly platform?: string
  readonly deployStatus?: string
}

export const createSite = (data: CreateSiteData) =>
  Effect.gen(function* () {
    const siteRepo = yield* SiteRepository

    try {
      // Step 1: Get user's GitHub access token
      const accessToken = yield* AuthService.getUserGitHubToken(data.userId)

      // Step 2: Get user's GitHub username for template data
      const githubUser = yield* AuthService.fetchGitHubUser(accessToken)

      // Step 3: Create GitHub repository with Pages (always use template)
      const githubRepo = yield* GitHubService.createRepositoryWithPages(
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
          siteAuthor: data.author || githubUser.login,
          githubUsername: githubUser.login,
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
        const importResult = yield* ArticleService.importArticlesFromGitHub(
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

export const validateSiteName = (name: string) =>
  Effect.gen(function* () {
    const trimmedName = name.trim()

    if (trimmedName.length === 0) {
      return yield* Effect.fail('Site name cannot be empty')
    }

    if (trimmedName.length > 100) {
      return yield* Effect.fail('Site name cannot exceed 100 characters')
    }

    // Basic slug validation for GitHub repo names
    const validNamePattern = /^[a-zA-Z0-9\-_.]+$/
    if (!validNamePattern.test(trimmedName)) {
      return yield* Effect.fail(
        'Site name can only contain letters, numbers, hyphens, underscores, and dots'
      )
    }

    return trimmedName
  })

export const validateGitRepo = (gitRepo: string) =>
  Effect.gen(function* () {
    const trimmedRepo = gitRepo.trim()

    if (trimmedRepo.length === 0) {
      return yield* Effect.fail('Git repository cannot be empty')
    }

    // Basic validation for GitHub repo format: username/repo-name
    const repoPattern = /^[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+$/
    if (!repoPattern.test(trimmedRepo)) {
      return yield* Effect.fail(
        'Git repository must be in format: username/repository-name'
      )
    }

    return trimmedRepo
  })
