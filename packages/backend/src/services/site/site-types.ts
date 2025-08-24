import { Data } from 'effect'

export class SiteNotFoundError extends Data.TaggedError('SiteNotFoundError')<{
  readonly siteId: string
}> {}

export class SiteCreationError extends Data.TaggedError('SiteCreationError')<{
  readonly reason: string
}> {}

export class SiteAccessDeniedError extends Data.TaggedError(
  'SiteAccessDeniedError'
)<{
  readonly siteId: string
  readonly userId: string
}> {}

export class DuplicateSiteNameError extends Data.TaggedError(
  'DuplicateSiteNameError'
)<{
  readonly name: string
  readonly userId: string
}> {}

export interface CreateSiteData {
  readonly userId: string
  readonly name: string
  readonly description?: string
  readonly author?: string
  readonly templateOwner?: string
  readonly templateRepo?: string
}

export interface UpdateSiteData {
  readonly name?: string
  readonly gitRepo?: string
  readonly platform?: string
  readonly deployStatus?: string
}
