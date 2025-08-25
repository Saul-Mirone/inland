import { Effect, Layer } from 'effect'

import { DatabaseService } from '../../services/database-service'
import {
  UserRepository,
  type UserRepositoryService,
  type CreateUserData,
  type CreateGitIntegrationData,
  type UserWithIntegrations,
} from '../user-repository'

// Individual atomic operations
const createUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.user.create({
        data: {
          username: data.username,
          email: data.email,
          avatarUrl: data.avatarUrl,
        },
      })
    )
  })

const findUserByUsername = (username: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.user.findUnique({
        where: { username },
      })
    )
  })

const findUserById = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    const user = yield* Effect.promise(() =>
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          gitIntegrations: {
            select: {
              platform: true,
              platformUsername: true,
            },
          },
        },
      })
    )
    return user as UserWithIntegrations | null
  })

const upsertUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.user.upsert({
        where: { username: data.username },
        update: {
          email: data.email,
          avatarUrl: data.avatarUrl,
        },
        create: {
          username: data.username,
          email: data.email,
          avatarUrl: data.avatarUrl,
        },
      })
    )
  })

const upsertGitIntegration = (data: CreateGitIntegrationData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService
    return yield* Effect.promise(() =>
      prisma.gitIntegration.upsert({
        where: {
          userId_platform: {
            userId: data.userId,
            platform: data.platform,
          },
        },
        update: {
          platformUsername: data.platformUsername,
          accessToken: data.accessToken,
          installationId: data.installationId,
        },
        create: {
          userId: data.userId,
          platform: data.platform,
          platformUsername: data.platformUsername,
          accessToken: data.accessToken,
          installationId: data.installationId,
        },
      })
    )
  })

const getGitHubToken = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    const gitIntegration = yield* Effect.promise(() =>
      prisma.gitIntegration.findFirst({
        where: {
          userId,
          platform: 'github',
        },
        select: {
          accessToken: true,
        },
      })
    )

    return gitIntegration?.accessToken || null
  })

const clearGitHubToken = (userId: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    yield* Effect.promise(() =>
      prisma.gitIntegration.updateMany({
        where: {
          userId,
          platform: 'github',
        },
        data: {
          accessToken: '',
          updatedAt: new Date(),
        },
      })
    )
  })

// Repository implementation using atomic operations
export const PrismaUserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.succeed({
    create: createUser,
    findByUsername: findUserByUsername,
    findById: findUserById,
    upsert: upsertUser,
    upsertGitIntegration: upsertGitIntegration,
    getGitHubToken: getGitHubToken,
    clearGitHubToken: clearGitHubToken,
  } satisfies UserRepositoryService)
)
