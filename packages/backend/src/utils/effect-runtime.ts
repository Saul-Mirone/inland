import type { Redis } from 'ioredis'

import { Layer, ManagedRuntime } from 'effect'

import type { prisma } from '../database/client'

import { AuthProviderLive } from '../plugins/auth-provider'
import { GitProviderLive } from '../plugins/git-provider'
import { PrismaArticleRepositoryLive } from '../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../repositories/implementations/prisma-user-repository'
import { ArticleServiceLive } from '../services/article/article-service-live'
import { AuthServiceLive } from '../services/auth/auth-service-live'
import { makeConfigService } from '../services/config-service'
import { makeDatabaseService } from '../services/database-service'
import { makeRedisService } from '../services/redis-service'
import { SessionServiceLive } from '../services/session/session-service-live'
import { SiteServiceLive } from '../services/site/site-service-live'
import { UserServiceLive } from '../services/user/user-service-live'

export const createAppRuntime = (
  prismaClient: typeof prisma,
  redisClient: Redis
) => {
  const DatabaseLayer = makeDatabaseService(prismaClient)
  const RedisLayer = makeRedisService(redisClient)
  const ConfigLayer = makeConfigService

  // Prisma repositories depend on DatabaseService
  const RepositoryLayer = Layer.mergeAll(
    PrismaArticleRepositoryLive,
    PrismaSiteRepositoryLive,
    PrismaUserRepositoryLive
  ).pipe(Layer.provide(DatabaseLayer))

  // SessionServiceLive depends on RedisService + ConfigService
  const SessionLayer = SessionServiceLive.pipe(
    Layer.provide(Layer.merge(RedisLayer, ConfigLayer))
  )

  const AppLayer = Layer.mergeAll(
    RedisLayer,
    ConfigLayer,
    RepositoryLayer,
    GitProviderLive.pipe(Layer.provide(ConfigLayer)),
    AuthProviderLive,
    ArticleServiceLive,
    AuthServiceLive,
    SessionLayer,
    SiteServiceLive,
    UserServiceLive
  )

  return ManagedRuntime.make(AppLayer)
}

export type AppRuntime = ReturnType<typeof createAppRuntime>
