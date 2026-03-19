import { Layer } from 'effect';

import { PrismaArticleRepositoryLive } from '../../repositories/implementations/prisma-article-repository';
import { PrismaSiteRepositoryLive } from '../../repositories/implementations/prisma-site-repository';
import { PrismaUserRepositoryLive } from '../../repositories/implementations/prisma-user-repository';
import { AuthServiceLive } from '../../services/auth/auth-service-live';
import { makeConfigService } from '../../services/config-service';
import { SessionServiceLive } from '../../services/session/session-service-live';
import { SiteServiceLive } from '../../services/site/site-service-live';
import { UserServiceLive } from '../../services/user/user-service-live';
import { MockArticleServiceLive } from './mock-article-service';
import { MockAuthProviderLive } from './mock-auth-provider';
import { TestDatabaseServiceLayer } from './mock-database';
import { MockGitProviderLive } from './mock-git-provider';
import { TestRedisServiceLayer } from './mock-redis';

const ConfigLayer = makeConfigService;

// Prisma repositories depend on DatabaseService
const RepositoryLayer = Layer.mergeAll(
  PrismaArticleRepositoryLive,
  PrismaSiteRepositoryLive,
  PrismaUserRepositoryLive
).pipe(Layer.provide(TestDatabaseServiceLayer));

// SessionServiceLive depends on RedisService + ConfigService
const SessionLayer = SessionServiceLive.pipe(
  Layer.provide(Layer.merge(TestRedisServiceLayer, ConfigLayer))
);

// Test layer that provides repositories with mock database, Git provider, and Auth provider
export const TestRepositoryLayer = Layer.mergeAll(
  TestRedisServiceLayer,
  ConfigLayer,
  RepositoryLayer,
  MockGitProviderLive,
  MockAuthProviderLive,
  MockArticleServiceLive,
  AuthServiceLive,
  SessionLayer,
  SiteServiceLive,
  UserServiceLive
);
