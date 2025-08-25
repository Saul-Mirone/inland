import type { Effect } from 'effect'
import type { FastifyReply } from 'fastify'

import { Layer, Exit, ManagedRuntime } from 'effect'

import type { prisma } from '../database/client'
import type { ArticleRepository } from '../repositories/article-repository'
import type { GitProviderRepositoryService } from '../repositories/git-provider-repository'
import type { SiteRepository } from '../repositories/site-repository'
import type { UserRepositoryService } from '../repositories/user-repository'
import type { ConfigService } from '../services/config-service'
import type { DatabaseService } from '../services/database-service'

import { GitProviderLive } from '../plugins/git-provider'
import { PrismaArticleRepositoryLive } from '../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../repositories/implementations/prisma-user-repository'
import { makeConfigService } from '../services/config-service'
import { makeDatabaseService } from '../services/database-service'

export const createAppRuntime = (prismaClient: typeof prisma) => {
  const AppLayer = Layer.mergeAll(
    makeDatabaseService(prismaClient),
    makeConfigService,
    PrismaArticleRepositoryLive,
    PrismaSiteRepositoryLive,
    PrismaUserRepositoryLive,
    GitProviderLive
  )

  return ManagedRuntime.make(AppLayer)
}

export const runEffect = async <A, E>(
  runtime: ManagedRuntime.ManagedRuntime<
    | DatabaseService
    | ConfigService
    | ArticleRepository
    | SiteRepository
    | UserRepositoryService
    | GitProviderRepositoryService,
    never
  >,
  effect: Effect.Effect<A, E>,
  reply: FastifyReply
) => {
  const exit = await runtime.runPromiseExit(effect)
  return Exit.match(exit, {
    onFailure: (cause) => {
      console.error('Effect failed:', cause)
      reply.code(500).send({
        error: 'Internal server error',
        details:
          process.env.NODE_ENV === 'development' ? String(cause) : undefined,
      })
    },
    onSuccess: (value) => {
      return reply.send(value)
    },
  })
}
