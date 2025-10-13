import { Effect } from 'effect'

import { UserRepository } from '../../../repositories/user-repository'
import { UserNotFoundError } from '../user-types'

export const findUserByUsername = (username: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository

    const user = yield* userRepo.findByUsername(username)

    if (!user) {
      return yield* new UserNotFoundError({ userId: username })
    }

    return user
  })
