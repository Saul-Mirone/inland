import { Effect } from 'effect'

import { UserRepository } from '../../repositories/user-repository'
import {
  UserNotFoundError,
  UserCreationError,
  type CreateUserData,
  type CreateGitIntegrationData,
} from './user-types'

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

export const findUserByUsername = (username: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository

    const user = yield* userRepo.findByUsername(username)

    if (!user) {
      return yield* new UserNotFoundError({ userId: username })
    }

    return user
  })

export const findUserById = (userId: string) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository

    const user = yield* userRepo.findById(userId)

    if (!user) {
      return yield* new UserNotFoundError({ userId })
    }

    return user
  })

export const upsertUser = (data: CreateUserData) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    return yield* userRepo.upsert(data)
  })

export const upsertGitIntegration = (data: CreateGitIntegrationData) =>
  Effect.gen(function* () {
    const userRepo = yield* UserRepository
    return yield* userRepo.upsertGitIntegration(data)
  })
