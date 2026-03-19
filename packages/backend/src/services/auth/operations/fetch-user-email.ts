import { Effect } from 'effect'

import { AuthProviderRepository } from '../../../repositories/auth-provider-repository'

export const fetchUserEmail = (accessToken: string) =>
  Effect.gen(function* () {
    const authProvider = yield* AuthProviderRepository
    return yield* authProvider.fetchUserEmail(accessToken)
  })
