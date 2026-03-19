import { BehaviorSubject } from 'rxjs'

import { buildApiUrl } from '@/services/api'
import { apiFetch } from '@/services/api/api-fetch'

export interface AuthUser {
  id: string
  username: string
  email: string | null
  avatarUrl: string | null
  createdAt: string
  gitIntegrations: Array<{
    platform: string
    platformUsername: string
  }>
}

export interface AuthState {
  status: 'loading' | 'anonymous' | 'authenticated'
  user: AuthUser | null
  error: string | null
}

const anonymousState: AuthState = {
  status: 'anonymous',
  user: null,
  error: null,
}

export const authState$ = new BehaviorSubject<AuthState>({
  status: 'loading',
  user: null,
  error: null,
})

let bootstrapPromise: Promise<AuthState> | null = null

const setAuthState = (state: AuthState): AuthState => {
  authState$.next(state)
  return state
}

export const clearAuthState = (): AuthState => setAuthState(anonymousState)

export const bootstrapAuth = async (force = false): Promise<AuthState> => {
  if (!force) {
    const currentState = authState$.getValue()

    if (currentState.status === 'authenticated') {
      return currentState
    }

    if (bootstrapPromise) {
      return bootstrapPromise
    }
  }

  setAuthState({
    status: 'loading',
    user: null,
    error: null,
  })

  bootstrapPromise = (async () => {
    try {
      const response = await apiFetch('/auth/me')

      if (response.status === 401) {
        return clearAuthState()
      }

      if (!response.ok) {
        throw new Error('Failed to fetch current user')
      }

      const data = (await response.json()) as { user: AuthUser }

      return setAuthState({
        status: 'authenticated',
        user: data.user,
        error: null,
      })
    } catch (error) {
      return setAuthState({
        ...anonymousState,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch current user',
      })
    } finally {
      bootstrapPromise = null
    }
  })()

  return bootstrapPromise
}

export const beginLogin = (): void => {
  window.location.assign(buildApiUrl('/auth/github'))
}

export const logout = async (): Promise<void> => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' })
  } catch {
    // Local auth state should still be cleared even if the network request fails.
  } finally {
    clearAuthState()
    window.location.assign('/')
  }
}
