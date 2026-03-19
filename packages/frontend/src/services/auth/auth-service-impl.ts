import { Effect } from 'effect'

import type { AuthModelService, AuthState, AuthUser } from '@/model/auth-model'
import type { ApiClientService } from '@/services/api'

import type { AuthServiceInterface } from './auth-service'

const anonymousState: AuthState = {
  status: 'anonymous',
  user: null,
  error: null,
}

export class AuthServiceImpl implements AuthServiceInterface {
  constructor(
    private readonly model: AuthModelService,
    private readonly api: ApiClientService
  ) {}

  private setAuthState(state: AuthState): AuthState {
    this.model.authState$.next(state)
    return state
  }

  private clearState(): AuthState {
    return this.setAuthState(anonymousState)
  }

  bootstrap = (force = false): Effect.Effect<AuthState> =>
    Effect.gen(this, function* () {
      if (!force) {
        const current = this.model.authState$.getValue()
        if (current.status === 'authenticated') return current
      }

      this.setAuthState({
        status: 'loading',
        user: null,
        error: null,
      })

      return yield* this.api.get<{ user: AuthUser }>('/auth/me').pipe(
        Effect.map((data) =>
          this.setAuthState({
            status: 'authenticated',
            user: data.user,
            error: null,
          })
        ),
        Effect.catchTag('ApiError', (e) =>
          Effect.succeed(
            e.status === 401
              ? this.clearState()
              : this.setAuthState({
                  ...anonymousState,
                  error: e.message,
                })
          )
        )
      )
    })

  login = (): Effect.Effect<void> =>
    Effect.sync(() => {
      window.location.assign(this.api.buildUrl('/auth/github'))
    })

  logout = (): Effect.Effect<void> =>
    Effect.gen(this, function* () {
      yield* this.api
        .post('/auth/logout')
        .pipe(Effect.catchAll(() => Effect.void))
      this.clearState()
      window.location.assign('/')
    })
}
