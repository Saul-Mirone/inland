import type { FastifyInstance, FastifyReply } from 'fastify';

import { Data, Effect } from 'effect';

export class HttpError extends Data.TaggedError('HttpError')<{
  readonly status: number;
  readonly message: string;
}> {}

export const httpError = (status: number, message: string) =>
  Effect.fail(new HttpError({ status, message }));

export function runRouteEffect<A, R>(
  fastify: FastifyInstance,
  reply: FastifyReply,
  effect: Effect.Effect<A, unknown, R>,
  options?: {
    fallbackMessage?: string;
    successCode?: number;
  }
): Promise<unknown> {
  const { fallbackMessage = 'Internal server error', successCode = 200 } =
    options ?? {};

  const pipeline = effect.pipe(
    Effect.matchEffect({
      onFailure: (error) =>
        Effect.sync(() => {
          if (reply.sent) return;
          if (error instanceof HttpError) {
            return reply.code(error.status).send({ error: error.message });
          }
          fastify.log.error(error);
          return reply.code(500).send({ error: fallbackMessage });
        }),
      onSuccess: (result) =>
        Effect.sync(() => {
          if (reply.sent) return;
          reply.code(successCode).send(result);
        }),
    })
  );

  return fastify.runtime.runPromise(pipeline as Effect.Effect<unknown, never>);
}
