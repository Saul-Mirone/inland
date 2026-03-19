import { Effect } from 'effect'

import type { ApiClientService } from './api-client'

import { ApiError } from './api-error'
import { apiFetch } from './api-fetch'

export class ApiClientImpl implements ApiClientService {
  private request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Effect.Effect<T, ApiError> {
    return Effect.tryPromise({
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
            typeof errorData === 'object' &&
            errorData !== null &&
            'error' in errorData &&
            typeof (errorData as Record<string, unknown>).error === 'string'
              ? ((errorData as Record<string, string>).error as string)
              : `Request failed with status ${response.status}`

          let redirectUrl: string | undefined
          if (response.status === 401) {
            redirectUrl = '/'
          }

          throw new ApiError({
            status: response.status,
            message,
            redirectUrl,
          })
        }

        if (
          response.status === 204 ||
          response.headers.get('content-length') === '0'
        ) {
          return {} as T
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
  }

  get<T>(path: string): Effect.Effect<T, ApiError> {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body?: unknown): Effect.Effect<T, ApiError> {
    return this.request<T>('POST', path, body)
  }

  put<T>(path: string, body?: unknown): Effect.Effect<T, ApiError> {
    return this.request<T>('PUT', path, body)
  }

  del<T>(path: string): Effect.Effect<T, ApiError> {
    return this.request<T>('DELETE', path)
  }
}
