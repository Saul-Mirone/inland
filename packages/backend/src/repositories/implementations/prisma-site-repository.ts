import { Effect, Layer } from 'effect'

import { DatabaseService } from '../../services/database-service'
import { RepositoryError } from '../repository-error'
import {
  SiteRepository,
  type SiteRepositoryService,
  type SiteCreateData,
  type SiteUpdateData,
} from '../site-repository'

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

const findSitesByUserIdWithCounts = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.tryPromise({
      try: () =>
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
        }),
      catch: (error) =>
        new RepositoryError({
          operation: 'site.findByUserIdWithCounts',
          cause: error,
        }),
    })
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
            ...(data.name && { name: data.name }),
            ...(data.gitRepo && { gitRepo: data.gitRepo }),
            ...(data.platform && { platform: data.platform }),
            ...(data.deployStatus && { deployStatus: data.deployStatus }),
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

// Repository implementation using atomic operations
export const PrismaSiteRepositoryLive = Layer.effect(
  SiteRepository,
  Effect.succeed({
    findById: findSiteById,
    findByIdWithUserId: findSiteByIdWithUserId,
    findByIdWithDetails: findSiteByIdWithDetails,
    findByUserId: findSitesByUserId,
    findByUserIdWithCounts: findSitesByUserIdWithCounts,
    findByIdWithFullDetails: findSiteByIdWithFullDetails,
    update: updateSite,
    delete: deleteSite,
    create: createSite,
  } satisfies SiteRepositoryService)
)
