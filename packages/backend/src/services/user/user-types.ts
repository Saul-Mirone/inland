import { Data } from 'effect'

import type { User, GitIntegration } from '../../../generated/prisma'

export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  readonly userId: string
}> {}

export class UserCreationError extends Data.TaggedError('UserCreationError')<{
  readonly reason: string
}> {}

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
