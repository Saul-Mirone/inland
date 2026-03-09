import { Context, Effect, Layer } from 'effect'

import type {
  PaginationMeta,
  SitesModelService,
  SiteWithCounts,
} from '@/model/sites-model'
import type { ApiClientService } from '@/utils/api-client'
import type { ApiError } from '@/utils/api-error'

import { SitesModel } from '@/model/sites-model'
import { ApiClient } from '@/utils/api-client'

// ── Request / Response types ────────────────────────────────────────

interface FetchSitesResponse {
  sites: SiteWithCounts[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateSiteData {
  name: string
  description?: string
  author?: string
  templateOwner: string
  templateRepo: string
}

export interface ImportSiteData {
  name: string
  gitRepoFullName: string
  description?: string
  setupWorkflow: boolean
  enablePages: boolean
  overrideExistingFiles: boolean
}

// ── Service interface ───────────────────────────────────────────────

export interface SitesControllerService {
  readonly fetchSites: (page?: number, limit?: number) => Effect.Effect<void>
  readonly deleteSite: (siteId: string) => Effect.Effect<void>
  readonly createSite: (data: CreateSiteData) => Effect.Effect<void>
  readonly importSite: (
    data: ImportSiteData
  ) => Effect.Effect<{ articlesImported?: number } | undefined>
}

// ── DI tag ──────────────────────────────────────────────────────────

export class SitesController extends Context.Tag('SitesController')<
  SitesController,
  SitesControllerService
>() {}

// ── Implementation ──────────────────────────────────────────────────

const makeSitesController = (
  model: SitesModelService,
  api: ApiClientService
): SitesControllerService => {
  const pushError = (error: ApiError) => {
    model.loading$.next(false)
    model.error$.next(error.message)
    if (error.redirectUrl) {
      setTimeout(() => {
        window.location.href = error.redirectUrl!
      }, 3000)
    }
  }

  const fetchSites = (page = 1, limit = 20): Effect.Effect<void> =>
    Effect.gen(function* () {
      model.loading$.next(true)
      model.error$.next(null)

      const data = yield* api.get<FetchSitesResponse>(
        `/sites?page=${page}&limit=${limit}`
      )

      model.sites$.next(data.sites)
      model.pagination$.next({
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      } satisfies PaginationMeta)
      model.loading$.next(false)
    }).pipe(Effect.catchAll((error) => Effect.sync(() => pushError(error))))

  const deleteSite = (siteId: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const currentSites = model.sites$.getValue()
      model.sites$.next(currentSites.filter((s) => s.id !== siteId))

      yield* api.del(`/sites/${siteId}`)
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          pushError(error)
          yield* fetchSites()
        })
      )
    )

  const createSite = (data: CreateSiteData): Effect.Effect<void> =>
    Effect.gen(function* () {
      yield* api.post('/sites', data)
      yield* fetchSites()
    }).pipe(Effect.catchAll((error) => Effect.sync(() => pushError(error))))

  const importSite = (
    data: ImportSiteData
  ): Effect.Effect<{ articlesImported?: number } | undefined> =>
    Effect.gen(function* () {
      const result = yield* api.post<{ articlesImported?: number }>(
        '/sites/import',
        data
      )
      yield* fetchSites()
      return result
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          pushError(error)
          return undefined
        })
      )
    )

  return { fetchSites, deleteSite, createSite, importSite }
}

// ── Live layer ──────────────────────────────────────────────────────

export const SitesControllerLive = Layer.effect(
  SitesController,
  Effect.gen(function* () {
    const model = yield* SitesModel
    const api = yield* ApiClient
    return makeSitesController(model, api)
  })
)
