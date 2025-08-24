import { Layer } from 'effect'

import { PrismaArticleRepositoryLive } from '../../repositories/implementations/prisma-article-repository'
import { PrismaSiteRepositoryLive } from '../../repositories/implementations/prisma-site-repository'
import { PrismaUserRepositoryLive } from '../../repositories/implementations/prisma-user-repository'
import { TestDatabaseServiceLayer } from './mock-database'

// Test layer that provides repositories with mock database
export const TestRepositoryLayer = Layer.mergeAll(
  TestDatabaseServiceLayer,
  PrismaArticleRepositoryLive,
  PrismaSiteRepositoryLive,
  PrismaUserRepositoryLive
)
