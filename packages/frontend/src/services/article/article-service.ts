import type { Effect } from 'effect'

import { Context } from 'effect'

export interface ArticleData {
  siteId: string
  title: string
  slug?: string
  content: string
  status: 'draft' | 'published'
}

export type CreateArticleData = ArticleData
export type UpdateArticleData = ArticleData

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
