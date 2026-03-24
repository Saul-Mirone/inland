import { Effect, Layer } from 'effect';

import { SitesModel } from '@/model/sites-model';
import { ApiClient } from '@/services/api';
import { ArticleService } from '@/services/article';
import { NavigationService } from '@/services/navigation';

import { SiteService } from './site-service';
import { SiteServiceImpl } from './site-service-impl';

export const SiteServiceLive = Layer.effect(
  SiteService,
  Effect.gen(function* () {
    const model = yield* SitesModel;
    const api = yield* ApiClient;
    const nav = yield* NavigationService;
    const articleService = yield* ArticleService;
    return new SiteServiceImpl(model, api, nav, articleService);
  })
);
