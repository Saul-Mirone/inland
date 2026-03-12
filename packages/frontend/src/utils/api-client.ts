import { Context, Effect, Layer } from 'effect'

import { apiFetch } from './api'
import { ApiError } from './api-error'

export interface ApiClientService {
  readonly get: <T>(path: string) => Effect.Effect<T, ApiError>
  readonly post: <T>(path: string, body?: unknown) => Effect.Effect<T, ApiError>
  readonly put: <T>(path: string, body?: unknown) => Effect.Effect<T, ApiError>
  readonly del: <T>(path: string) => Effect.Effect<T, ApiError>
}

export class ApiClient extends Context.Tag('ApiClient')<
  ApiClient,
  ApiClientService
>() {}

const request = <T>(
  method: string,
  path: string,
  body?: unknown
): Effect.Effect<T, ApiError> =>
  Effect.tryPromise({
    try: async () => {
      const headers: Record<string, string> = {}

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await apiFetch(path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          (errorData as Record<string, string>).error ||
          `Request failed with status ${response.status}`

        // Unauthorized requests should drop back to the login screen.
        let redirectUrl: string | undefined
        if (response.status === 401) {
          redirectUrl = '/'
        }

        throw new ApiError({ status: response.status, message, redirectUrl })
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      return (await response.json()) as T
    },
    catch: (error) => {
      if (error instanceof ApiError) return error
      return new ApiError({
        status: 0,
        message:
          error instanceof Error ? error.message : 'Unknown network error',
      })
    },
  })

const apiClientInstance: ApiClientService = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}

export const ApiClientLive = Layer.succeed(ApiClient, apiClientInstance)
