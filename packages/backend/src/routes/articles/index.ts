import type { FastifyInstance } from 'fastify'

import { createArticleRoute } from './create-article'
import { deleteArticleRoute } from './delete-article'
import { getArticleByIdRoute } from './get-article-by-id'
import { getSiteArticlesRoute } from './get-site-articles'
import { getUserArticlesRoute } from './get-user-articles'
import { publishArticleRoute } from './publish-article'
import { updateArticleRoute } from './update-article'

export const articleRoutes = async (fastify: FastifyInstance) => {
  await createArticleRoute(fastify)
  await getSiteArticlesRoute(fastify)
  await getUserArticlesRoute(fastify)
  await getArticleByIdRoute(fastify)
  await updateArticleRoute(fastify)
  await deleteArticleRoute(fastify)
  await publishArticleRoute(fastify)
}
