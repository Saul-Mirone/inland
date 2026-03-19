import { Effect } from 'effect'

import { UserRepository } from '../../../repositories/user-repository'
import { UserNotFoundError } from '../user-types'

export const findUserById = (userId: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository

    const user = yield* userRepo.findById(userId)

    if (!user) {
      return yield* new UserNotFoundError({ identifier: userId })
    }

    return user
  })
