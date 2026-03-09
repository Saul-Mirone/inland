import { Context, Layer } from 'effect'
import { BehaviorSubject } from 'rxjs'

export interface SiteWithCounts {
  id: string
  name: string
  gitRepo: string
  platform: string
  deployStatus: string
  createdAt: string
  _count: {
    articles: number
    media: number
  }
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface SitesModelService {
  readonly sites$: BehaviorSubject<SiteWithCounts[]>
  readonly loading$: BehaviorSubject<boolean>
  readonly error$: BehaviorSubject<string | null>
  readonly pagination$: BehaviorSubject<PaginationMeta | null>
}

// Singleton instance shared between Effect DI and React
const instance: SitesModelService = {
  sites$: new BehaviorSubject<SiteWithCounts[]>([]),
  loading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  pagination$: new BehaviorSubject<PaginationMeta | null>(null),
}

export class SitesModel extends Context.Tag('SitesModel')<
  SitesModel,
  SitesModelService
>() {}

export const SitesModelLive = Layer.succeed(SitesModel, instance)

// Direct access for React (subscribes to the same singleton)
export const sitesModel = instance
