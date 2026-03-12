import type { FastifyInstance } from 'fastify'

import fastifyPlugin from 'fastify-plugin'

import type { AppRuntime } from '../utils/effect-runtime'

import { createAppRuntime } from '../utils/effect-runtime'

declare module 'fastify' {
  interface FastifyInstance {
    runtime: AppRuntime
  }
}

async function effectRuntimePlugin(fastify: FastifyInstance) {
  const runtime = createAppRuntime(fastify.prisma, fastify.redis)
  fastify.decorate('runtime', runtime)

  fastify.addHook('onClose', async () => {
    await runtime.dispose()
    fastify.log.info('Effect runtime disposed')
  })
}

export const runtimePlugin = fastifyPlugin(effectRuntimePlugin, {
  name: 'effect-runtime',
  dependencies: ['database', 'redis'],
})
