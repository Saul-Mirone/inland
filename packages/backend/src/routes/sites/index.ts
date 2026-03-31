import type { FastifyInstance } from 'fastify';

import { createSiteRoute } from './create-site';
import { deleteSiteRoute } from './delete-site';
import { forceSyncRoute } from './force-sync';
import { getSiteByIdRoute } from './get-site-by-id';
import { getUserSitesRoute } from './get-user-sites';
import { importRepoRoute } from './import-repo';
import { repoConfigRoute } from './repo-config';
import { syncArticlesRoute } from './sync-articles';
import { updateSiteRoute } from './update-site';

export const siteRoutes = async (fastify: FastifyInstance) => {
  await createSiteRoute(fastify);
  await getUserSitesRoute(fastify);
  await getSiteByIdRoute(fastify);
  await updateSiteRoute(fastify);
  await deleteSiteRoute(fastify);
  await importRepoRoute(fastify);
  await repoConfigRoute(fastify);
  await syncArticlesRoute(fastify);
  await forceSyncRoute(fastify);
};
