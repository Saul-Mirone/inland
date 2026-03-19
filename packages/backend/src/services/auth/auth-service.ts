import { Context } from 'effect'

import type { fetchUser } from './operations/fetch-user'
import type { fetchUserEmail } from './operations/fetch-user-email'
import type { getUserAuthToken } from './operations/get-user-auth-token'
import type { processOAuth } from './operations/process-oauth'

export interface AuthServiceInterface {
  readonly fetchUser: typeof fetchUser
  readonly fetchUserEmail: typeof fetchUserEmail
  readonly getUserAuthToken: typeof getUserAuthToken
  readonly processOAuth: typeof processOAuth
}

export class AuthService extends Context.Tag('BackendAuthService')<
  AuthService,
  AuthServiceInterface
>() {}
