import { Effect, Layer } from 'effect'

import { DatabaseService } from '../../services/database-service'
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  type PaginationOptions,
} from '../pagination'
import { RepositoryError } from '../repository-error'
import {
  SiteRepository,
  type SiteRepositoryService,
  type SiteCreateData,
  type SiteUpdateData,
} from '../site-repository'
import { withDatabase } from '../with-database'

// Individual atomic operations
const findSiteById = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.findUnique({
          where: { id },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'site.findById', cause: error }),
    })
  })

const findSiteByIdWithUserId = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.findUnique({
          where: { id },
          select: { userId: true },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'site.findByIdWithUserId',
          cause: error,
        }),
    })
  })

const findSiteByIdWithDetails = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.findUnique({
          where: { id },
          select: {
            id: true,
            gitRepo: true,
            userId: true,
          },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'site.findByIdWithDetails',
          cause: error,
        }),
    })
  })

const findSitesByUserId = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'site.findByUserId',
          cause: error,
        }),
    })
  })

const findSitesByUserIdWithCounts = (
  userId: string,
  pagination?: PaginationOptions
) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    const page = pagination?.page ?? DEFAULT_PAGE
    const limit = pagination?.limit ?? DEFAULT_LIMIT
    const skip = (page - 1) * limit

    const [items, total] = yield* Effect.tryPromise({
      try: () =>
        prisma.$transaction([
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
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit,
          }),
          prisma.site.count({ where: { userId } }),
        ]),
      catch: (error) =>
        new RepositoryError({
          operation: 'site.findByUserIdWithCounts',
          cause: error,
        }),
    })

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  })

const findSiteByIdWithFullDetails = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.findUnique({
          where: { id },
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
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'site.findByIdWithFullDetails',
          cause: error,
        }),
    })
  })

const updateSite = (id: string, data: SiteUpdateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.update({
          where: { id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.gitRepo !== undefined && { gitRepo: data.gitRepo }),
            ...(data.platform !== undefined && { platform: data.platform }),
            ...(data.deployStatus !== undefined && {
              deployStatus: data.deployStatus,
            }),
          },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'site.update', cause: error }),
    })
  })

const deleteSite = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.delete({
          where: { id },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'site.delete', cause: error }),
    })
  })

const createSite = (data: SiteCreateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
        prisma.site.create({
          data: {
            name: data.name,
            userId: data.userId,
            gitRepo: data.gitRepo || '',
            platform: data.platform || 'github',
            deployStatus: data.deployStatus || 'pending',
            deployUrl: data.deployUrl,
          },
        }),
      catch: (error) =>
        new RepositoryError({ operation: 'site.create', cause: error }),
    })
  })

// Repository implementation — DatabaseService resolved at layer construction
export const PrismaSiteRepositoryLive = Layer.effect(
  SiteRepository,
  Effect.gen(function* () {
    const bind = withDatabase(yield* DatabaseService)

    return {
      findById: bind(findSiteById),
      findByIdWithUserId: bind(findSiteByIdWithUserId),
      findByIdWithDetails: bind(findSiteByIdWithDetails),
      findByUserId: bind(findSitesByUserId),
      findByUserIdWithCounts: bind(findSitesByUserIdWithCounts),
      findByIdWithFullDetails: bind(findSiteByIdWithFullDetails),
      update: bind(updateSite),
      delete: bind(deleteSite),
      create: bind(createSite),
    } satisfies SiteRepositoryService
  })
)
