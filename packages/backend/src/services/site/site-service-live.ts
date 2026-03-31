import { Layer } from 'effect';

import { createSite } from './git/create-site';
import { forceSyncSite } from './git/force-sync-site';
import { importRepo } from './git/import-repo';
import { deleteSite } from './operations/delete-site';
import { findSiteById } from './operations/find-site-by-id';
import { findUserSites } from './operations/find-user-sites';
import { getRepoConfig } from './operations/get-repo-config';
import { updateSite } from './operations/update-site';
import { SiteService } from './site-service';
import { validateSiteName, validateGitRepo } from './site-validation';

export const SiteServiceLive = Layer.succeed(SiteService, {
  createSite,
  deleteSite,
  findSiteById,
  findUserSites,
  updateSite,
  importRepo,
  forceSyncSite,
  getRepoConfig,
  validateSiteName,
  validateGitRepo,
});
