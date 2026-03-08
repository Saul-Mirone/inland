import type { Effect } from 'effect'

import { Context } from 'effect'

import type { User, GitIntegration } from '../../generated/prisma/client'
import type { DatabaseService } from '../services/database-service'
import type { RepositoryError } from './repository-error'

export interface CreateUserData {
  readonly username: string
  readonly email: string | null
  readonly avatarUrl: string | null
}

export interface CreateGitIntegrationData {
  readonly userId: string
  readonly platform: string
  readonly platformUsername: string
  readonly accessToken: string
  readonly installationId?: string
}

export interface UserWithIntegrations extends User {
  readonly gitIntegrations: GitIntegration[]
}

export interface UserRepositoryService {
  readonly create: (
    data: CreateUserData
  ) => Effect.Effect<User, RepositoryError, DatabaseService>
  readonly findByUsername: (
    username: string
  ) => Effect.Effect<User | null, RepositoryError, DatabaseService>
  readonly findById: (
    userId: string
  ) => Effect.Effect<
    UserWithIntegrations | null,
    RepositoryError,
    DatabaseService
  >
  readonly upsert: (
    data: CreateUserData
  ) => Effect.Effect<User, RepositoryError, DatabaseService>
  readonly upsertGitIntegration: (
    data: CreateGitIntegrationData
  ) => Effect.Effect<GitIntegration, RepositoryError, DatabaseService>
  readonly getAuthToken: (
    userId: string
  ) => Effect.Effect<string | null, RepositoryError, DatabaseService>
  readonly clearAuthToken: (
    userId: string
  ) => Effect.Effect<void, RepositoryError, DatabaseService>
}

export class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  UserRepositoryService
>() {}
