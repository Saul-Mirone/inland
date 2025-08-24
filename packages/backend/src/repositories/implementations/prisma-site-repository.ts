import { Effect, Layer } from 'effect'

import { DatabaseService } from '../../services/database-service'
import {
  SiteRepository,
  type SiteRepositoryService,
  type SiteCreateData,
} from '../site-repository'

// Individual atomic operations
const findSiteById = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id },
      })
    )
  })

const findSiteByIdWithUserId = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id },
        select: { userId: true },
      })
    )
  })

const findSiteByIdWithDetails = (id: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.site.findUnique({
        where: { id },
        select: {
          id: true,
          gitRepo: true,
          userId: true,
        },
      })
    )
  })

const findSitesByUserId = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.site.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })
    )
  })

const createSite = (data: SiteCreateData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.site.create({
        data: {
          name: data.name,
          userId: data.userId,
          gitRepo: data.gitRepo || '',
        },
      })
    )
  })

// Repository implementation using atomic operations
export const PrismaSiteRepositoryLive = Layer.effect(
  SiteRepository,
  Effect.succeed({
    findById: findSiteById,
    findByIdWithUserId: findSiteByIdWithUserId,
    findByIdWithDetails: findSiteByIdWithDetails,
    findByUserId: findSitesByUserId,
    create: createSite,
  } satisfies SiteRepositoryService)
)
