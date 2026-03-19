import { Layer } from 'effect'

import { AuthService } from './auth-service'
import { fetchUser } from './operations/fetch-user'
import { fetchUserEmail } from './operations/fetch-user-email'
import { getUserAuthToken } from './operations/get-user-auth-token'
import { processOAuth } from './operations/process-oauth'

export const AuthServiceLive = Layer.succeed(AuthService, {
  fetchUser,
  fetchUserEmail,
  getUserAuthToken,
  processOAuth,
})
