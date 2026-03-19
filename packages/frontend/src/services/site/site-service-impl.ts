import { Effect } from 'effect'

import type {
  PaginationMeta,
  SitesModelService,
  SiteWithCounts,
} from '@/model/sites-model'
import type { ApiClientService, ApiError } from '@/services/api'
import type { NavigationServiceInterface } from '@/services/navigation'

import type {
  CreateSiteData,
  ImportSiteData,
  SiteServiceInterface,
} from './site-service'

interface FetchSitesResponse {
  sites: SiteWithCounts[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export class SiteServiceImpl implements SiteServiceInterface {
  constructor(
    private readonly model: SitesModelService,
    private readonly api: ApiClientService,
    private readonly nav: NavigationServiceInterface
  ) {}

  private pushError(error: ApiError): void {
    this.model.loading$.next(false)
    this.model.error$.next(error.message)
    const { redirectUrl } = error
    if (redirectUrl) {
      this.nav.navigateDelayed(redirectUrl, 3000)
    }
  }

  fetchSites = (page = 1, limit = 20): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      this.model.loading$.next(true)
      this.model.error$.next(null)

      const data = yield* this.api.get<FetchSitesResponse>(
        `/sites?page=${page}&limit=${limit}`
      )

      this.model.sites$.next(data.sites)
      this.model.pagination$.next({
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      } satisfies PaginationMeta)
      this.model.loading$.next(false)
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    )

  deleteSite = (siteId: string): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      const currentSites = this.model.sites$.getValue()
      this.model.sites$.next(currentSites.filter((s) => s.id !== siteId))

      yield* this.api.del(`/sites/${siteId}`)
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(this, function* () {
          this.pushError(error)
          yield* this.fetchSites()
        })
      )
    )

  createSite = (data: CreateSiteData): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.api.post('/sites', data)
      yield* this.fetchSites()
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => this.pushError(error)))
    )

  importSite = (
    data: ImportSiteData
  ): Effect.Effect<{ articlesImported?: number } | undefined> =>
    Effect.gen(this, function* () {
      const result = yield* this.api.post<{
        articlesImported?: number
      }>('/sites/import', data)
      yield* this.fetchSites()
      return result
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          this.pushError(error)
          return undefined
        })
      )
    )
}
