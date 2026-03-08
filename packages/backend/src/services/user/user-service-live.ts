import { Layer } from 'effect'

import { createUser } from './operations/create-user'
import { findUserById } from './operations/find-user-by-id'
import { findUserByUsername } from './operations/find-user-by-username'
import { upsertGitIntegration } from './operations/upsert-git-integration'
import { upsertUser } from './operations/upsert-user'
import { UserService } from './user-service'

export const UserServiceLive = Layer.succeed(UserService, {
  createUser,
  findUserById,
  findUserByUsername,
  upsertGitIntegration,
  upsertUser,
})
