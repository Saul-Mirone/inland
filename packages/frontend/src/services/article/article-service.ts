import type { Effect } from 'effect'

import { Context } from 'effect'

export interface CreateArticleData {
  siteId: string
  title: string
  slug?: string
  content: string
  status: 'draft' | 'published'
}

export interface UpdateArticleData {
  siteId: string
  title: string
  slug?: string
  content: string
  status: 'draft' | 'published'
}

export interface ArticleServiceInterface {
  readonly fetchArticles: (siteId?: string) => Effect.Effect<void>
  readonly createArticle: (data: CreateArticleData) => Effect.Effect<void>
  readonly updateArticle: (
    id: string,
    data: UpdateArticleData
  ) => Effect.Effect<void>
  readonly deleteArticle: (id: string) => Effect.Effect<void>
  readonly publishArticle: (id: string) => Effect.Effect<void>
}

export class ArticleService extends Context.Tag('ArticleService')<
  ArticleService,
  ArticleServiceInterface
>() {}
