import { Context } from 'effect';

import type { createUser } from './operations/create-user';
import type { findUserById } from './operations/find-user-by-id';
import type { findUserByUsername } from './operations/find-user-by-username';
import type { upsertGitIntegration } from './operations/upsert-git-integration';
import type { upsertUser } from './operations/upsert-user';

export interface UserServiceInterface {
  readonly createUser: typeof createUser;
  readonly findUserById: typeof findUserById;
  readonly findUserByUsername: typeof findUserByUsername;
  readonly upsertGitIntegration: typeof upsertGitIntegration;
  readonly upsertUser: typeof upsertUser;
}

export class UserService extends Context.Tag('UserService')<
  UserService,
  UserServiceInterface
>() {}
