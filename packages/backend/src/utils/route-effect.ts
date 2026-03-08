import type { FastifyInstance, FastifyReply } from 'fastify'

import { Effect } from 'effect'

type ReplyPayload = { status: number; error: string }

export function runRouteEffect<A, E extends { readonly _tag: string }, R>(
  fastify: FastifyInstance,
  reply: FastifyReply,
  options: {
    effect: Effect.Effect<A, E, R>
    errors?: {
      [K in E['_tag']]?: (
        error: Extract<E, { readonly _tag: K }>
      ) => ReplyPayload
    }
    fallbackMessage: string
    successCode?: number
  }
): Promise<unknown> {
  const { effect, errors, fallbackMessage, successCode = 200 } = options

  let handled: Effect.Effect<unknown, unknown, R> = effect

  if (errors) {
    const record: Record<
      string,
      (error: { readonly _tag: string }) => Effect.Effect<unknown, never, never>
    > = {}
    for (const tag of Object.keys(errors)) {
      const handler = (
        errors as Record<
          string,
          ((e: { readonly _tag: string }) => ReplyPayload) | undefined
        >
      )[tag]
      if (handler) {
        record[tag] = (e) => {
          const { status, error: message } = handler(e)
          return Effect.sync(() => reply.code(status).send({ error: message }))
        }
      }
    }
    handled = (
      effect as Effect.Effect<unknown, { readonly _tag: string }, R>
    ).pipe(Effect.catchTags(record)) as Effect.Effect<unknown, unknown, R>
  }

  const pipeline = handled.pipe(
    Effect.matchEffect({
      onFailure: (error) =>
        Effect.sync(() => {
          fastify.log.error(error)
          return reply.code(500).send({ error: fallbackMessage })
        }),
      onSuccess: (result) =>
        Effect.sync(() => reply.code(successCode).send(result)),
    })
  )

  // R is generic but runPromise expects the concrete layer type
  return fastify.runtime.runPromise(pipeline as Effect.Effect<unknown, never>)
}
