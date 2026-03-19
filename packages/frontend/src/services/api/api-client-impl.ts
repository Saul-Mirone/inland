import { Effect } from 'effect'

import type { ApiClientService } from './api-client'

import { ApiError } from './api-error'

export class ApiClientImpl implements ApiClientService {
  private readonly baseUrl: string
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  buildUrl(path: string): string {
    return `${this.baseUrl}${path}`
  }

  private sendRequest(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers)
    return fetch(this.buildUrl(path), {
      ...init,
      headers,
      credentials: 'include',
    })
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const response = await this.sendRequest('/auth/refresh', {
            method: 'POST',
          })
          return response.ok
        } catch {
          return false
        } finally {
          this.refreshPromise = null
        }
      })()
    }
    return this.refreshPromise
  }

  private async apiFetch(
    path: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const response = await this.sendRequest(path, init)

    const skipRefresh = path === '/auth/refresh' || path === '/auth/logout'
    if (response.status !== 401 || skipRefresh) {
      return response
    }

    const refreshed = await this.refreshAccessToken()
    if (!refreshed) {
      return response
    }

    return this.sendRequest(path, init)
  }

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

        const response = await this.apiFetch(path, {
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
