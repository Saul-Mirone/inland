import type { Effect } from 'effect'

import { Context } from 'effect'

import type { JWTPayload } from '../../types/auth'
import type { SessionError } from './session-types'

export interface SessionServiceInterface {
  readonly createSession: (
    payload: JWTPayload
  ) => Effect.Effect<string, SessionError>
  readonly getSession: (
    refreshToken: string
  ) => Effect.Effect<JWTPayload | null, SessionError>
  readonly clearSession: (
    refreshToken: string
  ) => Effect.Effect<void, SessionError>
  readonly signAccessToken: (
    payload: JWTPayload
  ) => Effect.Effect<string, SessionError>
}

export class SessionService extends Context.Tag('SessionService')<
  SessionService,
  SessionServiceInterface
>() {}
