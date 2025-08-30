import { Schema as S } from 'effect'

import { Id, Slug } from '../common'

// Article status schemas
export const ArticleStatus = S.Literal('draft', 'published')

export const CreateArticleData = S.Struct({
  siteId: Id,
  title: S.String.pipe(S.minLength(1), S.maxLength(500)),
  slug: S.optional(Slug),
  content: S.String,
  status: S.optional(ArticleStatus),
})

export const UpdateArticleData = S.Struct({
  title: S.optional(S.String.pipe(S.minLength(1), S.maxLength(500))),
  slug: S.optional(Slug),
  content: S.optional(S.String),
  status: S.optional(ArticleStatus),
})

// Parameter schemas
export const ArticleIdParam = S.Struct({
  id: Id,
})

// Export types
export type ArticleStatus = S.Schema.Type<typeof ArticleStatus>
export type CreateArticleData = S.Schema.Type<typeof CreateArticleData>
export type UpdateArticleData = S.Schema.Type<typeof UpdateArticleData>
export type ArticleIdParam = S.Schema.Type<typeof ArticleIdParam>
