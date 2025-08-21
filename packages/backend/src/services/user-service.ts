import { Effect, Data } from 'effect'

import type { User, GitIntegration } from '../../generated/prisma'

import { DatabaseService } from './database-service'

export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  readonly userId: string
}> {}

export class UserCreationError extends Data.TaggedError('UserCreationError')<{
  readonly reason: string
}> {}

export interface CreateUserData {
  readonly username: string
  readonly email: string | null
  readonly avatarUrl: string | null
}

export interface CreateGitIntegrationData {
  readonly userId: string
  readonly platform: string
  readonly platformUsername: string
  readonly accessToken: string
  readonly installationId?: string
}

export interface UserWithIntegrations extends User {
  readonly gitIntegrations: GitIntegration[]
}

export const createUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    try {
      const user = yield* Effect.promise(() =>
        prisma.user.create({
          data: {
            username: data.username,
            email: data.email,
            avatarUrl: data.avatarUrl,
          },
        })
      )
      return user
    } catch (error) {
      return yield* new UserCreationError({
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

export const findUserByUsername = (username: string) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    const user = yield* Effect.promise(() =>
      prisma.user.findUnique({
        where: { username },
      })
    )

    if (!user) {
      return yield* new UserNotFoundError({ userId: username })
    }

    return user
  })

export const findUserById = (userId: string) =>
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

    if (!user) {
      return yield* new UserNotFoundError({ userId })
    }

    return user as UserWithIntegrations
  })

export const upsertUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    const user = yield* Effect.promise(() =>
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

    return user
  })

export const upsertGitIntegration = (data: CreateGitIntegrationData) =>
  Effect.gen(function* () {
    const { prisma } = yield* DatabaseService

    const integration = yield* Effect.promise(() =>
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

    return integration
  })
