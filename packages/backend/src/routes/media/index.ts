import type { FastifyInstance } from 'fastify';

import { deleteMediaRoute } from './delete-media';
import { listMediaRoute } from './list-media';
import { uploadMediaRoute } from './upload-media';

export const mediaRoutes = async (fastify: FastifyInstance) => {
  await uploadMediaRoute(fastify);
  await listMediaRoute(fastify);
  await deleteMediaRoute(fastify);
};
