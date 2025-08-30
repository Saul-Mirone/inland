import { Schema as S } from 'effect'

import { Email, Id, Url, Username } from '../common'

// User schemas
export const CreateUserData = S.Struct({
  username: Username,
  email: S.optional(Email),
  avatarUrl: S.optional(Url),
})

export const UpdateUserData = S.Struct({
  email: S.optional(Email),
  avatarUrl: S.optional(Url),
})

// Parameter schemas
export const UserIdParam = S.Struct({
  userId: Id,
})

// Export types
export type CreateUserData = S.Schema.Type<typeof CreateUserData>
export type UpdateUserData = S.Schema.Type<typeof UpdateUserData>
export type UserIdParam = S.Schema.Type<typeof UserIdParam>
