import { Layer } from 'effect'

import { PrismaArticleRepositoryLive } from '../../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../../repositories/implementations/prisma-user-repository'
import { MockAuthProviderLive } from './mock-auth-provider'
import { TestDatabaseServiceLayer } from './mock-database'
import { MockGitProviderLive } from './mock-git-provider'

// Test layer that provides repositories with mock database, Git provider, and Auth provider
export const TestRepositoryLayer = Layer.mergeAll(
  TestDatabaseServiceLayer,
  PrismaArticleRepositoryLive,
  PrismaSiteRepositoryLive,
  PrismaUserRepositoryLive,
  MockGitProviderLive,
  MockAuthProviderLive
)
