import { Data } from 'effect'

// Error types
export class ArticleNotFoundError extends Data.TaggedError(
  'ArticleNotFoundError'
)<{
  readonly articleId: string
}> {}

export class ArticleCreationError extends Data.TaggedError(
  'ArticleCreationError'
)<{
  readonly reason: string
}> {}

export class ArticleAccessDeniedError extends Data.TaggedError(
  'ArticleAccessDeniedError'
)<{
  readonly articleId: string
  readonly userId: string
}> {}

export class DuplicateSlugError extends Data.TaggedError('DuplicateSlugError')<{
  readonly slug: string
  readonly siteId: string
}> {}

export class SiteAccessError extends Data.TaggedError('SiteAccessError')<{
  readonly siteId: string
  readonly userId: string
}> {}

export class ArticleValidationError extends Data.TaggedError(
  'ArticleValidationError'
)<{
  readonly field: 'title' | 'slug' | 'content'
  readonly message: string
}> {}

// Domain types
export interface CreateArticleData {
  readonly siteId: string
  readonly title: string
  readonly slug: string
  readonly content: string
  readonly status?: 'draft' | 'published'
}

export interface UpdateArticleData {
  readonly title?: string
  readonly slug?: string
  readonly content?: string
  readonly status?: 'draft' | 'published'
}
