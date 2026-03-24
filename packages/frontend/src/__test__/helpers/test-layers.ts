import { Layer } from 'effect';

import { ArticleServiceLive } from '@/services/article';
import { AuthServiceLive } from '@/services/auth';
import { SiteServiceLive } from '@/services/site';

import { MockApiClientLive } from './mock-api-client';
import {
  MockArticlesModelLive,
  MockAuthModelLive,
  MockSitesModelLive,
} from './mock-models';
import { MockNavigationLive } from './mock-navigation';

// Shared dependencies for all frontend services
const SharedDeps = Layer.mergeAll(MockApiClientLive, MockNavigationLive);

// Article service test layer
export const ArticleTestLayer = ArticleServiceLive.pipe(
  Layer.provide(Layer.mergeAll(MockArticlesModelLive, SharedDeps))
);

// Auth service test layer
export const AuthTestLayer = AuthServiceLive.pipe(
  Layer.provide(Layer.mergeAll(MockAuthModelLive, SharedDeps))
);

// Site service test layer
export const SiteTestLayer = SiteServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(MockSitesModelLive, ArticleTestLayer, SharedDeps)
  )
);
