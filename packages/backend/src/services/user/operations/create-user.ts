import { Effect } from 'effect'

import { UserRepository } from '../../../repositories/user-repository'
import { UserCreationError, type CreateUserData } from '../user-types'

export const createUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository

    const user = yield* userRepo.create(data).pipe(
      Effect.catchTag('RepositoryError', (error) =>
        Effect.fail(
          new UserCreationError({
            reason:
              error.cause instanceof Error
                ? error.cause.message
                : 'Unknown error',
          })
        )
      )
    )
    return user
  })
