import { Context } from 'effect'

import type { createSite } from './git/create-site'
import type { importRepo } from './git/import-repo'
import type { deleteSite } from './operations/delete-site'
import type { findSiteById } from './operations/find-site-by-id'
import type { findUserSites } from './operations/find-user-sites'
import type { updateSite } from './operations/update-site'
import type { validateSiteName, validateGitRepo } from './site-validation'

export interface SiteServiceInterface {
  readonly createSite: typeof createSite
  readonly deleteSite: typeof deleteSite
  readonly findSiteById: typeof findSiteById
  readonly findUserSites: typeof findUserSites
  readonly updateSite: typeof updateSite
  readonly importRepo: typeof importRepo
  readonly validateSiteName: typeof validateSiteName
  readonly validateGitRepo: typeof validateGitRepo
}

export class SiteService extends Context.Tag('SiteService')<
  SiteService,
  SiteServiceInterface
>() {}
