import type { FastifyInstance } from 'fastify';

import { createSiteRoute } from './create-site';
import { deleteSiteRoute } from './delete-site';
import { getSiteByIdRoute } from './get-site-by-id';
import { getUserSitesRoute } from './get-user-sites';
import { importRepoRoute } from './import-repo';
import { updateSiteRoute } from './update-site';

export const siteRoutes = async (fastify: FastifyInstance) => {
  await createSiteRoute(fastify);
  await getUserSitesRoute(fastify);
  await getSiteByIdRoute(fastify);
  await updateSiteRoute(fastify);
  await deleteSiteRoute(fastify);
  await importRepoRoute(fastify);
};
