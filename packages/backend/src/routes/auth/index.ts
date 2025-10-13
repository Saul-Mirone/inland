import type { FastifyInstance } from 'fastify'

import { getCurrentUserRoute } from './get-current-user'
import { githubCallbackRoute } from './github-callback'
import { logoutRoute } from './logout'
import { refreshTokenRoute } from './refresh-token'

export const authRoutes = async (fastify: FastifyInstance) => {
  await githubCallbackRoute(fastify)
  await getCurrentUserRoute(fastify)
  await refreshTokenRoute(fastify)
  await logoutRoute(fastify)
}
