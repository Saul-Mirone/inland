import { Data } from 'effect';

export class SiteNotFoundError extends Data.TaggedError('SiteNotFoundError')<{
  readonly siteId: string;
}> {}

export class SiteCreationError extends Data.TaggedError('SiteCreationError')<{
  readonly reason: string;
}> {}

export class SiteUpdateError extends Data.TaggedError('SiteUpdateError')<{
  readonly reason: string;
}> {}

export class SiteAccessDeniedError extends Data.TaggedError(
  'SiteAccessDeniedError'
)<{
  readonly siteId: string;
  readonly userId: string;
}> {}

export class DuplicateSiteNameError extends Data.TaggedError(
  'DuplicateSiteNameError'
)<{
  readonly name: string;
  readonly userId: string;
}> {}

export class SiteValidationError extends Data.TaggedError(
  'SiteValidationError'
)<{
  readonly field: 'name' | 'displayName' | 'gitRepo';
  readonly message: string;
}> {}

export interface CreateSiteData {
  readonly userId: string;
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly author?: string;
  readonly templateOwner?: string;
  readonly templateRepo?: string;
}

export interface ImportRepoData {
  readonly userId: string;
  readonly name: string;
  readonly displayName?: string;
  readonly gitRepoFullName: string;
  readonly platform?: string;
  readonly setupWorkflow?: boolean;
  readonly enablePages?: boolean;
  readonly overrideExistingFiles?: boolean;
  readonly description?: string;
}

export interface UpdateSiteData {
  readonly name?: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly gitRepo?: string;
  readonly platform?: string;
  readonly deployStatus?: string;
}
