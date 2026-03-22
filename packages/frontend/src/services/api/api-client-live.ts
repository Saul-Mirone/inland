import { Effect, Layer } from 'effect';

import { ApiClient } from './api-client';
import { ApiClientImpl } from './api-client-impl';

export const ApiClientLive = Layer.effect(
  ApiClient,
  Effect.sync(
    () => new ApiClientImpl(import.meta.env.VITE_API_BASE_URL ?? '/api')
  )
);
