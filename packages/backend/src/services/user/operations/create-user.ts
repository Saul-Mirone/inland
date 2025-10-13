import { Effect } from 'effect'

import { UserRepository } from '../../../repositories/user-repository'
import { UserCreationError, type CreateUserData } from '../user-types'

export const createUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository

    try {
      const user = yield* userRepo.create(data)
      return user
    } catch (error) {
      return yield* new UserCreationError({
        reason: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })
