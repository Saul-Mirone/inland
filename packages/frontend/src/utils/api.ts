const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
let refreshPromise: Promise<boolean> | null = null

export const buildApiUrl = (path: string): string => `${API_BASE_URL}${path}`

const sendRequest = (path: string, init: RequestInit): Promise<Response> => {
  const headers = new Headers(init.headers)

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  })
}

const shouldSkipRefresh = (path: string): boolean =>
  path === '/auth/refresh' || path === '/auth/logout'

const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await sendRequest('/auth/refresh', {
          method: 'POST',
        })

        return response.ok
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }

  return refreshPromise
}

export const apiFetch = async (
  path: string,
  init: RequestInit = {}
): Promise<Response> => {
  const response = await sendRequest(path, init)

  if (response.status !== 401 || shouldSkipRefresh(path)) {
    return response
  }

  const refreshed = await refreshAccessToken()

  if (!refreshed) {
    return response
  }

  return sendRequest(path, init)
}
