import { Context, Layer } from 'effect'
import { BehaviorSubject } from 'rxjs'

export interface Article {
  id: string
  title: string
  slug: string
  content: string
  status: 'draft' | 'published'
  siteId: string
  createdAt: string
  updatedAt: string
  site: {
    id: string
    name: string
  }
}

export interface ArticlesModelService {
  readonly articles$: BehaviorSubject<Article[]>
  readonly loading$: BehaviorSubject<boolean>
  readonly error$: BehaviorSubject<string | null>
  readonly deletingId$: BehaviorSubject<string | null>
  readonly publishingId$: BehaviorSubject<string | null>
}

const instance: ArticlesModelService = {
  articles$: new BehaviorSubject<Article[]>([]),
  loading$: new BehaviorSubject(false),
  error$: new BehaviorSubject<string | null>(null),
  deletingId$: new BehaviorSubject<string | null>(null),
  publishingId$: new BehaviorSubject<string | null>(null),
}

export class ArticlesModel extends Context.Tag('ArticlesModel')<
  ArticlesModel,
  ArticlesModelService
>() {}

export const ArticlesModelLive = Layer.succeed(ArticlesModel, instance)

export const articlesModel = instance
