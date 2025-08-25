import { Layer } from 'effect'

import { PrismaArticleRepositoryLive } from '../../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../../repositories/implementations/prisma-user-repository'
import { TestDatabaseServiceLayer } from './mock-database'
import { MockGitProviderLive } from './mock-git-provider'

// Test layer that provides repositories with mock database and Git provider
export const TestRepositoryLayer = Layer.mergeAll(
  TestDatabaseServiceLayer,
  PrismaArticleRepositoryLive,
  PrismaSiteRepositoryLive,
  PrismaUserRepositoryLive,
  MockGitProviderLive
)
