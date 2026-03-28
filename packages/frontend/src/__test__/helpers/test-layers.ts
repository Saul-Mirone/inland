import { Layer } from 'effect';

import { ArticleServiceLive } from '@/services/article';
import { AuthServiceLive } from '@/services/auth';
import { MediaServiceLive } from '@/services/media';
import { SiteServiceLive } from '@/services/site';
import { ThemeServiceLive } from '@/services/theme';

import { MockApiClientLive } from './mock-api-client';
import {
  MockArticlesModelLive,
  MockAuthModelLive,
  MockMediaModelLive,
  MockSitesModelLive,
  MockThemeModelLive,
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

// Media service test layer
export const MediaTestLayer = MediaServiceLive.pipe(
  Layer.provide(Layer.mergeAll(MockMediaModelLive, SharedDeps))
);

// Theme service test layer
export const ThemeTestLayer = ThemeServiceLive.pipe(
  Layer.provide(MockThemeModelLive)
);
