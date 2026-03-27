import { Effect } from 'effect';

import type {
  PaginationMeta,
  SitesModelService,
  SiteWithCounts,
} from '@/model/sites-model';
import type { ApiClientService, ApiError } from '@/services/api';
import type { ArticleServiceInterface } from '@/services/article';
import type { NavigationServiceInterface } from '@/services/navigation';

import { pushServiceError } from '@/services/shared/push-error';

import type {
  CreateSiteData,
  ImportSiteData,
  SiteServiceInterface,
  SyncResult,
} from './site-service';

interface FetchSitesResponse {
  sites: SiteWithCounts[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class SiteServiceImpl implements SiteServiceInterface {
  constructor(
    private readonly model: SitesModelService,
    private readonly api: ApiClientService,
    private readonly nav: NavigationServiceInterface,
    private readonly articleService: ArticleServiceInterface
  ) {}

  private pushError(error: ApiError): void {
    pushServiceError(this.model, this.nav, error);
  }

  bootstrap = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.fetchSites();
      const sites = this.model.sites$.getValue();
      if (sites.length > 0 && this.model.selectedSiteId$.getValue() === null) {
        this.model.selectedSiteId$.next(sites[0].id);
      }
    });

  selectSite = (siteId: string): Effect.Effect<void> =>
    Effect.sync(() => {
      this.model.selectedSiteId$.next(siteId);
    });

  deselectSite = (): Effect.Effect<void> =>
    Effect.sync(() => {
      this.model.selectedSiteId$.next(null);
    });

  fetchSites = (page = 1, limit = 20): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.loading$.next(true);
      this.model.error$.next(null);

      const data = yield* this.api.get<FetchSitesResponse>(
        `/sites?page=${page}&limit=${limit}`
      );

      this.model.sites$.next(data.sites);
      this.model.pagination$.next({
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      } satisfies PaginationMeta);
      this.model.loading$.next(false);
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    );

  deleteSite = (siteId: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      const currentSites = this.model.sites$.getValue();
      this.model.sites$.next(currentSites.filter((s) => s.id !== siteId));

      yield* this.api.del(`/sites/${siteId}`);
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(this, function* () {
          this.pushError(error);
          yield* this.fetchSites();
        })
      )
    );

  createSite = (data: CreateSiteData): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      const result = yield* this.api.post<{ site: { id: string } }>(
        '/sites',
        data
      );
      yield* this.fetchSites();
      this.model.selectedSiteId$.next(result.site.id);
      yield* this.articleService.fetchArticles(result.site.id);
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    );

  importSite = (
    data: ImportSiteData
  ): Effect.Effect<{ articlesImported?: number } | undefined> =>
    Effect.gen(this, function* () {
      const result = yield* this.api.post<{
        site: { id: string };
        articlesImported?: number;
      }>('/sites/import', data);
      yield* this.fetchSites();
      this.model.selectedSiteId$.next(result.site.id);
      yield* this.articleService.fetchArticles(result.site.id);
      return result;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          this.pushError(error);
          return undefined;
        })
      )
    );

  syncArticles = (siteId: string): Effect.Effect<SyncResult | undefined> =>
    Effect.gen(this, function* () {
      const result = yield* this.api.post<SyncResult>(`/sites/${siteId}/sync`);
      yield* this.articleService.fetchArticles(siteId);
      yield* this.articleService.refreshCurrentArticle();
      return result;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          this.pushError(error);
          return undefined;
        })
      )
    );
}
