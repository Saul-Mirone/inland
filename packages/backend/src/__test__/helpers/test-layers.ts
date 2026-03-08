import { Layer } from 'effect'

import { PrismaArticleRepositoryLive } from '../../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../../repositories/implementations/prisma-user-repository'
import { SiteServiceLive } from '../../services/site/site-service-live'
import { UserServiceLive } from '../../services/user/user-service-live'
import { MockArticleServiceLive } from './mock-article-service'
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
  MockAuthProviderLive,
  MockArticleServiceLive,
  SiteServiceLive,
  UserServiceLive
)
