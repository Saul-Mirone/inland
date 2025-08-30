import { Schema as S } from 'effect'

import { GitPlatform } from '../auth'
import { Id, Url } from '../common'

// Site status schemas
export const SiteStatus = S.Literal('pending', 'initializing', 'ready', 'error')

export const CreateSiteData = S.Struct({
  name: S.String.pipe(S.minLength(1), S.maxLength(100)),
  description: S.optional(S.String.pipe(S.maxLength(500))),
  author: S.optional(S.String.pipe(S.maxLength(100))),
  templateOwner: S.optional(S.String),
  templateRepo: S.optional(S.String),
})

export const UpdateSiteData = S.Struct({
  name: S.optional(S.String.pipe(S.minLength(1), S.maxLength(100))),
  gitRepo: S.optional(S.String.pipe(S.minLength(1))),
  platform: S.optional(GitPlatform),
  deployStatus: S.optional(SiteStatus),
  deployUrl: S.optional(Url),
})

// Parameter schemas
export const SiteIdParam = S.Struct({
  siteId: Id,
})

export const SiteParam = S.Struct({
  id: Id,
})

// Template data for site creation
export const TemplateData = S.Struct({
  siteName: S.String,
  siteDescription: S.optional(S.String),
  siteAuthor: S.String,
  githubUsername: S.String,
})

// Export types
export type SiteStatus = S.Schema.Type<typeof SiteStatus>
export type CreateSiteData = S.Schema.Type<typeof CreateSiteData>
export type UpdateSiteData = S.Schema.Type<typeof UpdateSiteData>
export type SiteIdParam = S.Schema.Type<typeof SiteIdParam>
export type SiteParam = S.Schema.Type<typeof SiteParam>
export type TemplateData = S.Schema.Type<typeof TemplateData>
