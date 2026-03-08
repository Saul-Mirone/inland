import { Layer, ManagedRuntime } from 'effect'

import type { prisma } from '../database/client'

import { AuthProviderLive } from '../plugins/auth-provider'
import { GitProviderLive } from '../plugins/git-provider'
import { PrismaArticleRepositoryLive } from '../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../repositories/implementations/prisma-user-repository'
import { makeConfigService } from '../services/config-service'
import { makeDatabaseService } from '../services/database-service'
import { ArticleServiceLive } from '../services/implementations/article-service'

export const createAppRuntime = (prismaClient: typeof prisma) => {
  const AppLayer = Layer.mergeAll(
    makeDatabaseService(prismaClient),
    makeConfigService,
    PrismaArticleRepositoryLive,
    PrismaSiteRepositoryLive,
    PrismaUserRepositoryLive,
    GitProviderLive,
    AuthProviderLive,
    ArticleServiceLive
  )

  return ManagedRuntime.make(AppLayer)
}

export type AppRuntime = ReturnType<typeof createAppRuntime>
