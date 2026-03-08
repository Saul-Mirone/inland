import { Layer, ManagedRuntime } from 'effect'

import type { prisma } from '../database/client'

import { AuthProviderLive } from '../plugins/auth-provider'
import { GitProviderLive } from '../plugins/git-provider'
import { PrismaArticleRepositoryLive } from '../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../repositories/implementations/prisma-user-repository'
import { ArticleServiceLive } from '../services/article/article-service-live'
import { makeConfigService } from '../services/config-service'
import { makeDatabaseService } from '../services/database-service'
import { SiteServiceLive } from '../services/site/site-service-live'
import { UserServiceLive } from '../services/user/user-service-live'

export const createAppRuntime = (prismaClient: typeof prisma) => {
  const AppLayer = Layer.mergeAll(
    makeDatabaseService(prismaClient),
    makeConfigService,
    PrismaArticleRepositoryLive,
    PrismaSiteRepositoryLive,
    PrismaUserRepositoryLive,
    GitProviderLive,
    AuthProviderLive,
    ArticleServiceLive,
    SiteServiceLive,
    UserServiceLive
  )

  return ManagedRuntime.make(AppLayer)
}

export type AppRuntime = ReturnType<typeof createAppRuntime>
