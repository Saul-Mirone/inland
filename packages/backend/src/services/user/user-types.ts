import { Data } from 'effect'

export type {
  CreateUserData,
  CreateGitIntegrationData,
  UserWithIntegrations,
} from '../../repositories/user-repository'

export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  readonly identifier: string
}> {}

export class UserCreationError extends Data.TaggedError('UserCreationError')<{
  readonly reason: string
}> {}
