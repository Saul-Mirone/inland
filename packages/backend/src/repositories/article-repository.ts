import type { Effect } from 'effect'

import { Context } from 'effect'

import type { Article } from '../../generated/prisma'
import type { DatabaseService } from '../services/database-service'

// Domain types for Article operations
export interface ArticleCreateData {
  readonly siteId: string
  readonly title: string
  readonly slug: string
  readonly content: string
  readonly status?: 'draft' | 'published'
}

export interface ArticleUpdateData {
  readonly title?: string
  readonly slug?: string
  readonly content?: string
  readonly status?: 'draft' | 'published'
}

export interface ArticleWithSite extends Article {
  readonly site: {
    readonly id: string
    readonly name: string
    readonly userId?: string
    readonly gitRepo?: string | null
  }
}

export interface ArticleListItem {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly status: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

// Repository interface - defines what operations we need
export interface ArticleRepositoryService {
  readonly create: (
    data: ArticleCreateData
  ) => Effect.Effect<ArticleWithSite, never, DatabaseService>
  readonly findById: (
    id: string
  ) => Effect.Effect<ArticleWithSite | null, never, DatabaseService>
  readonly findBySiteIdAndSlug: (
    siteId: string,
    slug: string
  ) => Effect.Effect<Article | null, never, DatabaseService>
  readonly findBySiteId: (
    siteId: string
  ) => Effect.Effect<ArticleListItem[], never, DatabaseService>
  readonly findByUserId: (
    userId: string
  ) => Effect.Effect<ArticleWithSite[], never, DatabaseService>
  readonly update: (
    id: string,
    data: ArticleUpdateData
  ) => Effect.Effect<ArticleWithSite, never, DatabaseService>
  readonly delete: (
    id: string
  ) => Effect.Effect<Article, never, DatabaseService>
}

// Context tag for dependency injection
export class ArticleRepository extends Context.Tag('ArticleRepository')<
  ArticleRepository,
  ArticleRepositoryService
>() {}
