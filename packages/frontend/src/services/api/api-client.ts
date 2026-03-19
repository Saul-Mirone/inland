import type { Effect } from 'effect';

import { Context } from 'effect';

import type { ApiError } from './api-error';

export interface ApiClientService {
  readonly get: <T>(path: string) => Effect.Effect<T, ApiError>;
  readonly post: <T>(
    path: string,
    body?: unknown
  ) => Effect.Effect<T, ApiError>;
  readonly put: <T>(path: string, body?: unknown) => Effect.Effect<T, ApiError>;
  readonly del: <T>(path: string) => Effect.Effect<T, ApiError>;
  readonly buildUrl: (path: string) => string;
}

export class ApiClient extends Context.Tag('ApiClient')<
  ApiClient,
  ApiClientService
>() {}
