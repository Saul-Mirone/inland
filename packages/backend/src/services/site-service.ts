import { Effect, Data } from 'effect'

import * as AuthService from './auth-service'
import { DatabaseService } from './database-service'
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
}

export interface UpdateSiteData {
  readonly name?: string
  readonly gitRepo?: string
  readonly platform?: string
  readonly deployStatus?: string
}

export const createSite = (data: CreateSiteData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    try {
      // Step 1: Get user's GitHub access token
      const accessToken = yield* AuthService.getUserGitHubToken(data.userId)

      // Step 2: Create GitHub repository with Pages
      const githubRepo = yield* GitHubService.createRepositoryWithPages(
        accessToken,
        {
          name: data.name,
          description: data.description,
        }
      )

      // Step 3: Save site to database
      const site = yield* Effect.promise(() =>
        prisma.site.create({
          data: {
            userId: data.userId,
            name: data.name,
            gitRepo: githubRepo.fullName,
            platform: 'github',
            deployStatus: 'deployed',
            deployUrl: githubRepo.pagesUrl,
          },
        })
      )

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
    const { prisma } = yield* DatabaseService

    const site = yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id: siteId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          articles: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              updatedAt: 'desc',
            },
            take: 5,
          },
          media: {
            select: {
              id: true,
              filename: true,
              fileSize: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
        },
      })
    )

    if (!site) {
      return yield* new SiteNotFoundError({ siteId })
    }

    return site
  })

export const findUserSites = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    const sites = yield* Effect.promise(() =>
      prisma.site.findMany({
        where: { userId },
        include: {
          _count: {
            select: {
              articles: true,
              media: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    )

    return sites
  })

export const updateSite = (
  siteId: string,
  userId: string,
  data: UpdateSiteData
) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    // First check if site exists and user has access
    const existingSite = yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id: siteId },
        select: { userId: true },
      })
    )

    if (!existingSite) {
      return yield* new SiteNotFoundError({ siteId })
    }

    if (existingSite.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId })
    }

    try {
      const updatedSite = yield* Effect.promise(() =>
        prisma.site.update({
          where: { id: siteId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.gitRepo && { gitRepo: data.gitRepo }),
            ...(data.platform && { platform: data.platform }),
            ...(data.deployStatus && { deployStatus: data.deployStatus }),
          },
        })
      )

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
    const { prisma } = yield* DatabaseService

    // First check if site exists and user has access
    const existingSite = yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id: siteId },
        select: { userId: true },
      })
    )

    if (!existingSite) {
      return yield* new SiteNotFoundError({ siteId })
    }

    if (existingSite.userId !== userId) {
      return yield* new SiteAccessDeniedError({ siteId, userId })
    }

    const deletedSite = yield* Effect.promise(() =>
      prisma.site.delete({
        where: { id: siteId },
      })
    )

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
