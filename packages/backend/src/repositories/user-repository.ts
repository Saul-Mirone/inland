import type { Effect } from 'effect'

import { Context } from 'effect'

import type { User, GitIntegration } from '../../generated/prisma'
import type { DatabaseService } from '../services/database-service'

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
  ) => Effect.Effect<User, never, DatabaseService>
  readonly findByUsername: (
    username: string
  ) => Effect.Effect<User | null, never, DatabaseService>
  readonly findById: (
    userId: string
  ) => Effect.Effect<UserWithIntegrations | null, never, DatabaseService>
  readonly upsert: (
    data: CreateUserData
  ) => Effect.Effect<User, never, DatabaseService>
  readonly upsertGitIntegration: (
    data: CreateGitIntegrationData
  ) => Effect.Effect<GitIntegration, never, DatabaseService>
}

export const UserRepository =
  Context.GenericTag<UserRepositoryService>('UserRepository')
